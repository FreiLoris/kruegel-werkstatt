-- One way to compare search text (UX G-04): "Hübscher", "Huebscher" and "hubscher" find each other,
-- so do "Françoise"/"francoise", "Yılmaz"/"yilmaz" and "ZH-445566"/"ZH 445566".
-- Applied to the stored text AND to the typed words, so both sides are folded alike:
--   lower case → accents off (ä → a, ç → c, ı → i, ß → ss) → ae/oe/ue → a/o/u
--   → no - . / ( ) ' + _ (plates, phone numbers, double names)
-- The same rule is in the frontend (lib/search.ts) for the searches in the browser.
CREATE FUNCTION search_fold(input text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
SELECT regexp_replace(
           replace(replace(replace(replace(
               translate(lower(input),
                         'áàâäãåāçčćéèêëēěíìîïıñňóòôöõøōřšúùûüūůýÿžđ',
                         'aaaaaaaccceeeeeeiiiiinnooooooorsuuuuuuyyzd'),
               'ß', 'ss'), 'ae', 'a'), 'oe', 'o'), 'ue', 'u'),
           '[-./()''+_]', '', 'g')
$$;
