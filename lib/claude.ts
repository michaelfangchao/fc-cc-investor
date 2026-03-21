import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Generate a JSON analysis from Claude. Returns parsed object or error sentinel. */
export async function generateAnalysis(prompt: string): Promise<Record<string, unknown>> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Strip markdown code fences if Claude wraps in ```json
    const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/```\s*$/m, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.error('Claude generateAnalysis error:', err)
    return { error: 'AI分析生成中' }
  }
}

/** Generate a plain-text paragraph from Claude (for email digest). */
export async function generateText(prompt: string): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    return message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()
  } catch (err) {
    console.error('Claude generateText error:', err)
    return ''
  }
}
