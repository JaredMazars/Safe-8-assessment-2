# Halyard Font Files – Forvis Mazars Brand Font

Place the licensed Halyard `.woff2` files here. Obtain them from your Forvis Mazars brand/design team or the Klim Type Foundry licence.

## Required files

### Halyard Text (body copy)
- `HalyardText-Light.woff2`       (weight 300)
- `HalyardText-Regular.woff2`     (weight 400)
- `HalyardText-Medium.woff2`      (weight 500)
- `HalyardText-SemiBold.woff2`    (weight 600)
- `HalyardText-Bold.woff2`        (weight 700)

### Halyard Display (headings / display)
- `HalyardDisplay-Light.woff2`      (weight 300)
- `HalyardDisplay-Regular.woff2`    (weight 400)
- `HalyardDisplay-Medium.woff2`     (weight 500)
- `HalyardDisplay-SemiBold.woff2`   (weight 600)
- `HalyardDisplay-Bold.woff2`       (weight 700)
- `HalyardDisplay-ExtraBold.woff2`  (weight 800)

## Font assignment
| Usage            | Font            |
|------------------|-----------------|
| Body / UI text   | Halyard Text    |
| Headings h1–h6   | Halyard Display |
| Score/display    | Halyard Display |

The `@font-face` declarations are already wired up in `src/App.css`.  
The fallback font is `Arial, sans-serif` until the `.woff2` files are present.
