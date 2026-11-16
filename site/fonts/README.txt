Fonts — production bundle
=========================

Eight woff2 cuts, tight-subset from the full-charset originals in the design
project (`eras/NN/fonts/`). Every file is SIL OFL 1.1; the licence for each
family sits beside it as OFL-<Family>.txt.

The 600 weight was dropped at assembly. It served one 13 px label (the footer
brand in era 03), which is now 700. See docs/assets-and-motion.md.


Regenerating after a copy change
--------------------------------

The subset is built from the characters the page ACTUALLY RENDERS. If copy
changes and introduces a character the subset lacks, that glyph falls back
mid-word — visible and ugly, and easy to miss. Regenerate after any copy edit.

  1. Collect the character inventory from the served markup:
     visible text, plus aria-label / title / alt / content values, plus any
     JS string containing Persian. (Class names and selectors are not text;
     including them inflates the subset by ~20 KB for nothing.)

  2. Run, per file:

     python -m fontTools.subset <original.woff2> \
       --output-file=<target.woff2> \
       --flavor=woff2 \
       --layout-features='*' \
       --unicodes=<U+ list>

     `--layout-features='*'` is not optional. Dropping it breaks Arabic/Persian
     joining and contextual forms.

  3. Current inventory: 93 distinct characters. If your count jumps sharply,
     you probably swept CSS or JS code instead of rendered text.


Files
-----

  vazirmatn-300.woff2    era 01/03  manifesto thesis, type specimen
  vazirmatn-400.woff2    era 01/03  body — PRELOADED, font-display:block
  vazirmatn-700.woff2    era 01/03  headline, footer brand — PRELOADED, block
  ario-dots1-400.woff2   era 02     single cut, declared at 400 and 700
  estedad-400.woff2      era 04     body
  estedad-800.woff2      era 04     display
  rooyin-400.woff2       era 05     body
  rooyin-700.woff2       era 05     display

  OFL-Vazirmatn.txt      Vazirmatn Project Authors
  OFL-Ario.txt           Arad Project Authors
  OFL-Estedad.txt        Estedad Project Authors
  OFL-Rooyin.txt         Rooyin-Perfect Project Authors

Total: 101 KB. First paint blocks on 34 KB (the two Vazirmatn cuts).
