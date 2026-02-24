CREATE OR REPLACE FUNCTION public.get_role_key_from_format(p_format text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE 
    WHEN p_format IN ('post', 'carrossel', 'carousel', 'story') THEN 'designer'
    WHEN p_format IN ('video', 'vídeo', 'reels') THEN 'videomaker'
    ELSE NULL
  END
$function$;