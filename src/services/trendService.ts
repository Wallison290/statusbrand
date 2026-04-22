export interface TrendResult {
  term: string
  source: string
  relevance: 'high' | 'medium' | 'low'
}

export interface TrendData {
  related_searches: TrendResult[]
  autocomplete: string[]
  people_also_ask: string[]
  youtube_ideas: string[]
  content_angles: string[]
}

// Módulo modular de tendências — estrutura pronta para integração futura com APIs reais
// Atualmente retorna dados simulados baseados no termo para evitar dependências externas

async function getGoogleAutocomplete(term: string): Promise<string[]> {
  // Futuro: integrar com Google Autocomplete API
  const variations = [
    `${term} para iniciantes`,
    `como usar ${term}`,
    `${term} dicas`,
    `${term} 2024`,
    `${term} passo a passo`,
    `${term} exemplos práticos`,
  ]
  return variations
}

async function getRelatedSearches(term: string): Promise<TrendResult[]> {
  // Futuro: integrar com SerpAPI ou DataForSEO
  return [
    { term: `${term} estratégia`, source: 'google', relevance: 'high' },
    { term: `${term} resultados`, source: 'google', relevance: 'high' },
    { term: `melhor ${term}`, source: 'google', relevance: 'medium' },
    { term: `${term} profissional`, source: 'google', relevance: 'medium' },
  ]
}

async function getPeopleAlsoAsk(term: string): Promise<string[]> {
  // Futuro: integrar com SerpAPI People Also Ask
  return [
    `O que é ${term}?`,
    `Como fazer ${term}?`,
    `Qual o melhor ${term}?`,
    `Por que usar ${term}?`,
    `Vale a pena investir em ${term}?`,
  ]
}

async function getYouTubeIdeas(term: string): Promise<string[]> {
  // Futuro: integrar com YouTube Data API
  return [
    `Tutorial completo: ${term} do zero`,
    `${term}: erros que você comete`,
    `Como eu usei ${term} e mudei tudo`,
    `${term} em 5 minutos`,
  ]
}

function generateContentAngles(term: string, niche?: string): string[] {
  const base = [
    `Mito vs. Realidade sobre ${term}`,
    `5 motivos para investir em ${term} agora`,
    `A história de quem transformou o negócio com ${term}`,
    `O erro mais comum em ${term} (e como evitar)`,
    `${term}: o guia definitivo para ${niche || 'o seu negócio'}`,
    `Por que ${term} é essencial em ${new Date().getFullYear()}`,
  ]
  return base
}

export async function getTrends(term: string, niche?: string): Promise<TrendData> {
  const [autocomplete, related_searches, people_also_ask, youtube_ideas] = await Promise.all([
    getGoogleAutocomplete(term),
    getRelatedSearches(term),
    getPeopleAlsoAsk(term),
    getYouTubeIdeas(term),
  ])

  return {
    autocomplete,
    related_searches,
    people_also_ask,
    youtube_ideas,
    content_angles: generateContentAngles(term, niche),
  }
}
