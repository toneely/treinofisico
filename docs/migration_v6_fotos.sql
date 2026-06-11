-- Tabela de Fotos de Progresso
CREATE TABLE IF NOT EXISTS fotos_progresso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url_foto_media TEXT NOT NULL,
    url_miniatura TEXT NOT NULL,
    anotacao TEXT,
    data_foto TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para fotos_progresso
ALTER TABLE fotos_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress photos"
    ON fotos_progresso FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
