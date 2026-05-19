// ── Serviço de geração de conteúdo — chama Edge Function (key segura) ─────────
import { callProxy } from '@/lib/aiProxy'
import type { ContentGeneratorForm, GeneratedContent, Client, BrandDNA } from '@/types'
import { buildContentPrompt, buildImprovementPrompt } from '@/utils/prompts'

export async function generateContent(
  form: ContentGeneratorForm,
  client?: Client | null,
  dna?: BrandDNA | null
): Promise<GeneratedContent> {
  const prompt = buildContentPrompt(form, client, dna)
  const { content } = await callProxy<{ content: string }>('generate-content', { prompt })
  if (!content) throw new Error('Resposta vazia da IA')
  return JSON.parse(content) as GeneratedContent
}

export async function improveText(
  text: string,
  action: 'melhorar' | 'encurtar' | 'expandir' | 'persuasivo'
): Promise<string> {
  const prompt = buildImprovementPrompt(text, action)
  const { content } = await callProxy<{ content: string }>('improve-text', { prompt })
  return content ?? text
}
