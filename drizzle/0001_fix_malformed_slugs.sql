-- Fix malformed slugs in categories and products tables
-- Replicates toSlug() logic: transliterate accents, lowercase, trim, spaces→hyphens, remove invalid chars, collapse hyphens

UPDATE categories
SET slug = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(trim(translate(slug,
            'áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ',
            'aeiouaeiouaeiouaeiounAEIOUAEIOUAEIOUAEIOUN'))),
        '\s+', '-', 'g'),
      '[^a-z0-9-]', '', 'g'),
    '-+', '-', 'g'),
  '^-', ''),
'-$', '')
WHERE slug ~ '[A-Z\s]'
   OR slug ~ '[áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ]'
   OR slug ~ '--'
   OR slug ~ '^-|-$';

UPDATE products
SET slug = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(trim(translate(slug,
            'áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ',
            'aeiouaeiouaeiouaeiounAEIOUAEIOUAEIOUAEIOUN'))),
        '\s+', '-', 'g'),
      '[^a-z0-9-]', '', 'g'),
    '-+', '-', 'g'),
  '^-', ''),
'-$', '')
WHERE slug ~ '[A-Z\s]'
   OR slug ~ '[áéíóúàèìòùâêîôûäëïöüñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÑ]'
   OR slug ~ '--'
   OR slug ~ '^-|-$';
