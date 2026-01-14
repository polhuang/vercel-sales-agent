import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Send message to Claude and get response
   */
  async sendMessage(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for more consistent extractions
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      // Extract text content from response
      const textContent = message.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error: any) {
      console.error('Claude API error:', error.message);
      throw new Error(`Failed to get response from Claude: ${error.message}`);
    }
  }

  /**
   * Send message and parse JSON response
   */
  async sendMessageForJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
    const response = await this.sendMessage(systemPrompt, userMessage);

    // Try to extract JSON from response (Claude sometimes wraps it in markdown)
    let jsonText = response.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(jsonText.trim());
    } catch (error) {
      console.error('Failed to parse Claude response as JSON:', jsonText.substring(0, 200));
      throw new Error('Claude response was not valid JSON');
    }
  }
}
