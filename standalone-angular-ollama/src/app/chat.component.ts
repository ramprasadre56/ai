import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="chat-container">
      <div class="messages" #messagesContainer>
        @for (message of messages; track $index) {
          <div class="message" [class.user]="message.role === 'user'" [class.assistant]="message.role === 'assistant'">
            <div class="message-content">{{ message.content }}</div>
          </div>
        }
        @if (isLoading) {
          <div class="message assistant">
            <div class="message-content loading">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        }
      </div>
      <form [formGroup]="chatForm" (ngSubmit)="sendMessage()" class="input-form">
        <input
          type="text"
          formControlName="userInput"
          placeholder="Type your message..."
          [disabled]="isLoading"
        />
        <button type="submit" [disabled]="chatForm.invalid || isLoading">
          Send
        </button>
      </form>
    </div>
  `,
  styles: [`
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .messages {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 500px;
    }
    .message {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      animation: fadeIn 0.3s ease;
    }
    .message.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .message.assistant {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.1);
      color: #e0e0e0;
    }
    .loading {
      display: flex;
      gap: 4px;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .input-form {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: #e0e0e0;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #667eea;
    }
    input::placeholder {
      color: #888;
    }
    button {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.2s;
    }
    button:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ChatComponent {
  messages: Message[] = [];
  isLoading = false;
  chatForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.chatForm = this.fb.group({
      userInput: ['', Validators.required]
    });
  }

  async sendMessage() {
    if (this.chatForm.invalid || this.isLoading) return;

    const userInput = this.chatForm.value.userInput;
    this.chatForm.reset();

    // Add user message
    this.messages.push({ role: 'user', content: userInput });
    this.isLoading = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.messages.map(m => ({
            role: m.role,
            content: [{ type: 'text', text: m.content }]
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add placeholder for assistant message
      this.messages.push({ role: 'assistant', content: '' });
      const assistantIndex = this.messages.length - 1;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse the streaming response (AI SDK v6 format)
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text-delta' && data.delta) {
                assistantMessage += data.delta;
                this.messages[assistantIndex].content = assistantMessage;
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      this.messages.push({ role: 'assistant', content: 'Sorry, an error occurred. Please try again.' });
    } finally {
      this.isLoading = false;
    }
  }
}
