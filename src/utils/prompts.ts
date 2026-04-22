import type { ContentGeneratorForm, Client, BrandDNA } from '@/types'

export function buildContentPrompt(
  form: ContentGeneratorForm,
  client?: Client | null,
  dna?: BrandDNA | null
): string {
  const typeLabels: Record<string, string> = {
    post: 'Post de feed',
    carrossel: 'Carrossel',
    reels: 'Reels / Vídeo curto',
    story: 'Story',
    educativo: 'Conteúdo educativo',
    venda: 'Conteúdo de venda',
    autoridade: 'Conteúdo de autoridade',
    engajamento: 'Conteúdo de engajamento',
  }

  const objectiveLabels: Record<string, string> = {
    atrair_atencao: 'Atrair atenção e novos seguidores',
    engajar: 'Gerar engajamento (curtidas, comentários, compartilhamentos)',
    gerar_autoridade: 'Gerar autoridade e credibilidade',
    gerar_leads: 'Gerar leads e captar contatos',
    vender: 'Vender produto ou serviço',
  }

  const sizeInstructions: Record<string, string> = {
    curto: 'Legenda curta (até 150 caracteres)',
    medio: 'Legenda média (entre 150 e 400 caracteres)',
    longo: 'Legenda longa (entre 400 e 800 caracteres, com storytelling)',
  }

  let clientContext = ''
  if (client) {
    clientContext = `
## CONTEXTO DO CLIENTE
- Empresa: ${client.company_name}
- Nicho: ${client.niche}
- Objetivo principal: ${client.main_objective || 'Não informado'}
- Público-alvo: ${client.target_audience || 'Não informado'}
- Tom de voz: ${client.tone_of_voice || form.tone_of_voice}
- Diferenciais: ${client.differentials || 'Não informado'}
- Serviços: ${client.services_offered || 'Não informado'}
${client.forbidden_words ? `- Palavras proibidas: ${client.forbidden_words}` : ''}
`
  }

  let dnaContext = ''
  if (dna) {
    dnaContext = `
## DNA DA MARCA
- Como a marca fala: ${dna.how_brand_speaks || 'Não definido'}
- Como NÃO deve falar: ${dna.how_brand_not_speaks || 'Não definido'}
- Posicionamento: ${dna.positioning || 'Não definido'}
- Linguagem ideal: ${dna.ideal_language || 'Não definida'}
- Gatilhos mentais: ${dna.mental_triggers || 'Não definidos'}
`
  }

  return `Você é um especialista em marketing digital e copywriting estratégico para redes sociais. Sua missão é criar conteúdo que pareça HUMANO, ORIGINAL e ESTRATÉGICO — nunca genérico ou robotizado.

${clientContext}
${dnaContext}

## BRIEFING DO CONTEÚDO
- Termo principal: ${form.term}
- Tipo de conteúdo: ${typeLabels[form.content_type]}
- Objetivo: ${objectiveLabels[form.objective]}
- Tom de voz: ${form.tone_of_voice}
- Tamanho da legenda: ${sizeInstructions[form.caption_size]}
- Incluir emojis: ${form.include_emojis ? 'Sim' : 'Não'}
- Incluir hashtags: ${form.include_hashtags ? 'Sim' : 'Não'}
${form.additional_notes ? `- Observações: ${form.additional_notes}` : ''}

## INSTRUÇÕES DE QUALIDADE
1. Escreva como um copywriter humano experiente, não como uma IA
2. Use linguagem real, não corporativês
3. O gancho (primeira frase) deve parar o scroll
4. O CTA deve ser natural e persuasivo
5. Se o tipo for carrossel, crie os títulos de cada slide
6. Se for Reels, crie um roteiro com gancho, desenvolvimento e CTA
7. Adapte completamente ao nicho e DNA da marca se fornecidos

## FORMATO DE RESPOSTA (JSON obrigatório)
Responda SOMENTE com JSON válido, sem texto antes ou depois:
{
  "title": "Título chamativo do conteúdo",
  "subtitle": "Subtítulo ou complemento",
  "caption": "Legenda completa pronta para postar",
  "cta": "Call-to-action específico e persuasivo",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 (se solicitado)",
  "keywords": "palavra1, palavra2, palavra3",
  "visual_suggestion": "Sugestão detalhada de como deve ser o visual/imagem/vídeo",
  "carousel_ideas": "Slide 1: título | Slide 2: título | Slide 3: título (se carrossel)",
  "video_script": "GANCHO: ... | DESENVOLVIMENTO: ... | CTA: ... (se reels/vídeo)"
}`
}

export function buildImprovementPrompt(
  currentCaption: string,
  action: 'melhorar' | 'encurtar' | 'expandir' | 'persuasivo'
): string {
  const actions: Record<string, string> = {
    melhorar: 'Melhore a qualidade geral do texto mantendo a essência, tornando-o mais fluido, humano e impactante.',
    encurtar: 'Encurte o texto mantendo o essencial. Remova o que for redundante sem perder o impacto.',
    expandir: 'Expanda o texto com mais detalhes, storytelling e contexto. Mantenha o tom e aumente o poder persuasivo.',
    persuasivo: 'Reescreva com foco em persuasão. Use gatilhos mentais, urgência e linguagem de venda sem ser agressivo.',
  }

  return `Você é um especialista em copywriting. ${actions[action]}

TEXTO ORIGINAL:
${currentCaption}

Responda APENAS com o texto melhorado, sem explicações ou comentários.`
}
