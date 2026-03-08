'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating personalized notification messages
 * for Dosimat Pro customers based on specific events.
 *
 * - generatePersonalizedNotification - A function that handles the personalized notification generation process.
 * - GenerateNotificationInput - The input type for the generatePersonalizedNotification function.
 * - GenerateNotificationOutput - The return type for the generatePersonalizedNotification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNotificationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer to personalize the notification for.'),
  eventType: z.enum(['overduePayment', 'chlorineRefill']).describe('The type of event for which to generate a notification.'),
  eventDetails: z.string().describe('Specific details relevant to the event. For "overduePayment", this might include "Amount due: $50.00, Due date: 2024-08-15". For "chlorineRefill", it could be "Last refill date: 2024-07-01, Pool size: 10000 liters".'),
});
export type GenerateNotificationInput = z.infer<typeof GenerateNotificationInputSchema>;

const GenerateNotificationOutputSchema = z.object({
  notificationMessage: z.string().describe('The personalized notification message for the customer.'),
  suggestedAction: z.string().describe('A clear, concise call to action for the customer based on the event.'),
});
export type GenerateNotificationOutput = z.infer<typeof GenerateNotificationOutputSchema>;

export async function generatePersonalizedNotification(input: GenerateNotificationInput): Promise<GenerateNotificationOutput> {
  return generatePersonalizedNotificationsFlow(input);
}

const notificationPrompt = ai.definePrompt({
  name: 'generateNotificationPrompt',
  input: {schema: GenerateNotificationInputSchema},
  output: {schema: GenerateNotificationOutputSchema},
  prompt: `You are an AI assistant for Dosimat Pro, a pool maintenance management system. Your task is to generate personalized and effective notification messages for customers based on specific events.

The tone should be friendly, helpful, and encourage prompt action.

---
Customer Name: {{{customerName}}}
Event Type: {{{eventType}}}
Event Details: {{{eventDetails}}}
---

Based on the information above, please generate a personalized notification message and a clear suggested action for the customer.

{{#if (eq eventType "overduePayment")}}
  The message should gently remind them about the outstanding payment.
  The suggested action should clearly state how they can make the payment and include relevant details from "eventDetails".
{{else if (eq eventType "chlorineRefill")}}
  The message should remind them that a chlorine refill might be due soon or is overdue, considering "eventDetails".
  The suggested action should prompt them to schedule a refill or check their chlorine levels.
{{/if}}

Ensure the message is concise and to the point.`,
});

const generatePersonalizedNotificationsFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedNotificationsFlow',
    inputSchema: GenerateNotificationInputSchema,
    outputSchema: GenerateNotificationOutputSchema,
  },
  async input => {
    const {output} = await notificationPrompt(input);
    return output!;
  }
);
