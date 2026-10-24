-- Fotos fetes amb el mòbil: només imatges i com a màxim 15 MB per fitxer
-- (l'app ja les redueix a 1920 px abans de pujar-les).
update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif']
 where id = 'fotos';
