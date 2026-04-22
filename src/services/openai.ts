import OpenAI from 'openai'
import type { ContentGeneratorForm, GeneratedContent, Client, BrandDNA } from '@/types'
import { buildContentPrompt, buildImprovementPrompt } from '@/utils/prompts'

const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY não configurada no .env')
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
}

export async function generateContent(
  form: ContentGeneratorForm,
  client?: Client | null,
  dna?: BrandDNA | null
): Promise<GeneratedContent> {
  const openai = getClient()
  const prompt = buildContentPrompt(form, client, dna)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.85,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content
  if (!raw) throw new Error('Resposta vazia da OpenAI')

  const parsed = JSON.parse(raw) as GeneratedContent
  return parsed
}

export async function improveText(
  text: string,
  action: 'melhorar' | 'encurtar' | 'expandir' | 'persuasivo'
): Promise<string> {
  const openai = getClient()
  const prompt = buildImprovementPrompt(text, action)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return response.choices[0]?.message?.content?.trim() || text
}
