import logger from '../utils/logger.js';

/**
 * Simple in-memory queue service for async email processing
 * In production, replace with Bull/BullMQ + Redis for persistence
 */

class QueueService {
  constructor() {
    this.queues = new Map();
    this.processing = new Map();
  }

  /**
   * Create or get a queue
   * @param {string} name - Queue name
   * @returns {Object} Queue object
   */
  getQueue(name) {
    if (!this.queues.has(name)) {
      this.queues.set(name, {
        name,
        jobs: [],
        processor: null,
        concurrency: 1,
        processing: false
      });
    }
    return this.queues.get(name);
  }

  /**
   * Add job to queue
   * @param {string} queueName - Queue name
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Object>} Job object
   */
  async add(queueName, data, options = {}) {
    const queue = this.getQueue(queueName);
    const job = {
      id: `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data,
      options,
      attempts: 0,
      maxAttempts: options.attempts || 3,
      createdAt: new Date(),
      status: 'waiting'
    };

    queue.jobs.push(job);
    logger.debug('Job added to queue', { queueName, jobId: job.id });

    // Start processing if not already running
    this.processQueue(queueName);

    return job;
  }

  /**
   * Define queue processor
   * @param {string} queueName - Queue name
   * @param {Function} processor - Processor function
   * @param {Object} options - Processing options
   */
  process(queueName, processor, options = {}) {
    const queue = this.getQueue(queueName);
    queue.processor = processor;
    queue.concurrency = options.concurrency || 1;
    
    logger.info('Queue processor registered', { queueName, concurrency: queue.concurrency });
  }

  /**
   * Process jobs in queue
   * @param {string} queueName - Queue name
   */
  async processQueue(queueName) {
    const queue = this.getQueue(queueName);

    if (!queue.processor) {
      logger.warn('No processor defined for queue', { queueName });
      return;
    }

    if (queue.processing) {
      return; // Already processing
    }

    queue.processing = true;

    while (queue.jobs.length > 0) {
      const job = queue.jobs.shift();
      
      try {
        job.status = 'processing';
        job.attempts++;
        logger.debug('Processing job', { queueName, jobId: job.id, attempt: job.attempts });

        await queue.processor(job);

        job.status = 'completed';
        logger.info('Job completed', { queueName, jobId: job.id });

      } catch (error) {
        logger.error('Job failed', { 
          queueName, 
          jobId: job.id, 
          attempt: job.attempts, 
          error: error.message 
        });

        if (job.attempts < job.maxAttempts) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, job.attempts - 1), 30000);
          logger.info('Retrying job', { jobId: job.id, delay, nextAttempt: job.attempts + 1 });
          
          setTimeout(() => {
            queue.jobs.push(job);
            this.processQueue(queueName);
          }, delay);
        } else {
          job.status = 'failed';
          logger.error('Job permanently failed', { queueName, jobId: job.id });
        }
      }
    }

    queue.processing = false;
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Queue name
   * @returns {Object} Queue stats
   */
  getStats(queueName) {
    const queue = this.getQueue(queueName);
    return {
      name: queueName,
      waiting: queue.jobs.filter(j => j.status === 'waiting').length,
      processing: queue.jobs.filter(j => j.status === 'processing').length,
      completed: 0, // We don't keep completed jobs in memory
      failed: 0,
      total: queue.jobs.length
    };
  }

  /**
   * Get all queue statistics
   * @returns {Array} All queue stats
   */
  getAllStats() {
    return Array.from(this.queues.keys()).map(name => this.getStats(name));
  }
}

// Create singleton instance
const queueService = new QueueService();

// Email queue processor
queueService.process('email', async (job) => {
  const { type, data } = job.data;
  
  // Import email service dynamically to avoid circular dependencies
  const { sendWelcomeEmail, sendPasswordResetEmail, sendAssessmentResultsEmail } = 
    await import('./emailService.js');

  switch (type) {
    case 'welcome':
      await sendWelcomeEmail(data);
      break;
    case 'password-reset':
      await sendPasswordResetEmail(data);
      break;
    case 'assessment-results':
      await sendAssessmentResultsEmail(data);
      break;
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}, { concurrency: 3 }); // Process 3 emails concurrently

export default queueService;
