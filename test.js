require('dotenv').config();
console.log('Environment variables:', {
  OPENAI_KEY: process.env.OPENAI_API_KEY?.slice(0,4),
  SUPABASE_URL: process.env.SUPABASE_URL?.slice(0,10),
  GOOGLE_CREDS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
});
const OpenAI = require('openai');
const {google} = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const path = require('path');

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // Pass the API key from the environment
});
const resend = new Resend(process.env.RESEND_API_KEY);
const YOUR_EMAIL = process.env.GOOGLE_EMAIL;

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_ANON_KEY
);

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS), // Add this line
  scopes: [
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/drive'
  ]
});

async function evaluateEligibility(userData) {
    const systemPrompt = `Return JSON response explaining survey eligibility based on these rules:
   
   Priority 1 (High):
   - Customer service complaint follow-up (check 7 days after complaint)
   - First-time customer (total_purchases = 1)
   
   Priority 2 (Medium):
   - Purchase frequency is "decreasing"
   - No purchases in last 90 days
   
   Email rules:
   - All eligible users get survey generated
   - Email sent only if marketing_opt_in=true AND has email opens
   
   Return JSON with:
   {
    "eligible": boolean,
    "reason": "clear explanation",
    "priority": 1-3,
    "send_email": boolean,
    "trigger_type": "complaint_followup|purchase_decrease|inactivity|first_time"
   }`;
   
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Evaluate eligibility for:
   ${JSON.stringify(userData, null, 2)}
   
   Generate survey regardless of marketing opt-in status or purchase history.
   Only use marketing opt-in and email opens to determine if email should be sent.`
        }
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }
    });
   
    return JSON.parse(completion.choices[0].message.content);
   }

async function sendSurveyEmail(surveyUrl, toEmail, surveyTitle) {
 try {
   const data = await resend.emails.send({
     from: 'Surveus <onboarding@resend.dev>',
     to: [toEmail],
     subject: `Survey: ${surveyTitle}`,
     html: `
       <!DOCTYPE html>
       <html>
         <body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
           <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
             <h2 style="color: #2c3e50; margin-bottom: 20px;">Your Opinion Matters</h2>
             ${userData.personal_info?.first_name ? `<p>Hi ${userData.personal_info.first_name},</p>` : '<p>Hello,</p>'}
             <p>We'd love to hear your thoughts in our latest survey: <strong>${surveyTitle}</strong></p>
             <div style="margin: 30px 0;">
               <a href="${surveyUrl}" 
                  style="background-color: #3498db; 
                         color: white; 
                         padding: 12px 25px; 
                         text-decoration: none; 
                         border-radius: 5px;
                         display: inline-block;">
                 Take the Survey
               </a>
             </div>
             <p>Thank you for your valuable feedback!</p>
             <hr style="border: 1px solid #eee; margin: 20px 0;">
             <p style="color: #7f8c8d; font-size: 12px;">
               If you're having trouble with the button above, copy and paste this link into your browser:
               <br>${surveyUrl}
             </p>
           </div>
         </body>
       </html>
     `
   });

   console.log('Email sent successfully:', data);
   return data;
 } catch (error) {
   console.error('Email sending failed:', error);
   throw error;
 }
}

async function generateSurveyQuestions(customerContext = {}) {
    const systemPrompt = `You are an advanced survey design expert creating personalized surveys.
   
   DATA-DRIVEN QUESTION RULES:
   1. Purchase History:
   ${customerContext.purchase_history ? 
    "- Purchase data exists: Focus on satisfaction and future needs" : 
    customerContext.total_purchases === 0 ? 
      "- No purchases yet: Ask about browsing interests and purchase barriers" :
      "- Purchase data missing: Include basic purchase history questions"}
   
   2. Service Interactions:
   ${customerContext.service_interactions ? 
    "- Known interactions: Focus on resolution satisfaction" : 
    "- No interaction data: Include service experience questions"}
   
   3. Communication Preferences:
   ${customerContext.marketing_engagement ? 
    "- Engagement data exists: Focus on content preferences" : 
    "- No engagement data: Ask about preferred channels and frequency"}
   
   QUESTION STRUCTURE:
   1. Order:
   - Start with satisfaction/feedback
   - Include missing data questions only if needed
   - End with NPS/future intent
   
   2. Question Types:
   - Multiple choice
   - Rating (1-5 scale)
   - Open-ended (max 50%)
   
   3. Focus Areas:
   - Why over what
   - Future preferences
   - Improvement suggestions
   - Emotional aspects
   
   PERSONALIZATION:
   ${customerContext.personal_info?.first_name ? 
    `- Include "${customerContext.personal_info.first_name}" in first question
   - Maintain personal touch throughout` : 
    '- Use general friendly tone'}
   - Industry context: ${customerContext.industry}
   - Language: ${customerContext.language || 'English'}
   
   Return JSON with:
   {
    "questions": [
      {
        "type": "multiple_choice|rating|open_ended",
        "question": "question text",
        "options": ["option1", "option2"],
        "scale": {"min": 1, "max": 5, "lowLabel": "Poor", "highLabel": "Excellent"}
      }
    ],
    "metadata": {
      "personalization_factors": ["list used factors"],
      "language": "${customerContext.language || 'English'}"
    }
   }`;
   
    const userPrompt = `Create survey based on context:
   ${JSON.stringify(customerContext, null, 2)}
   
   Key requirements:
   1. Only ask about unknown data
   2. Focus on quality/satisfaction for known interactions
   3. Include basic data collection where missing
   4. End with NPS/future intent`;
   
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }
    });
   
    return JSON.parse(completion.choices[0].message.content);
   }

async function createAndShareForm(questions) {
 const uniqueTitle = `Surveus v1 ${new Date().toISOString().slice(0,10)}-${Math.random().toString(36).slice(-4)}`;
 const authClient = await auth.getClient();
 
 const forms = google.forms({
   version: 'v1',
   auth: authClient
 });

 const drive = google.drive({
   version: 'v3',
   auth: authClient
 });

 const form = await forms.forms.create({
   requestBody: {
     info: {
       title: uniqueTitle,
       documentTitle: uniqueTitle
     }
   }
 });

 const formId = form.data.formId;
 console.log("Created form with ID:", formId);

 const { data, error } = await supabase
   .from('surveys')
   .insert([
     { 
       form_id: formId,
       title: uniqueTitle,
       status: 'active',
       questions: questions,
       metadata: questions.metadata
     }
   ])
   .select();

 if (error) {
   console.error('Supabase error:', error);
   return null;
 }

 const surveyId = data[0].id;
 console.log("Created survey with ID:", surveyId);

 await forms.forms.batchUpdate({
   formId: formId,
   requestBody: {
     requests: questions.questions.map(q => ({
       createItem: {
         item: {
           title: q.question,
           questionItem: q.type === 'rating' ? {
             question: {
               required: true,
               scaleQuestion: {
                 low: 1,
                 high: 5,
                 lowLabel: "Poor",
                 highLabel: "Excellent"
               }
             }
           } : q.type === 'open_ended' ? {
             question: {
               required: true,
               textQuestion: {
                 paragraph: true
               }
             }
           } : {
             question: {
               required: true,
               choiceQuestion: {
                 type: 'RADIO',
                 options: q.options.map(opt => ({value: opt}))
               }
             }
           }
         },
         location: {
           index: 0
         }
       }
     }))
   }
 });

 await drive.permissions.create({
   fileId: formId,
   requestBody: {
     role: 'writer',
     type: 'user',
     emailAddress: YOUR_EMAIL
   }
 });

 console.log("Added questions to form");
 console.log("Shared form with:", YOUR_EMAIL);
 console.log("Form URL:", `https://docs.google.com/forms/d/${formId}/edit`);
 console.log("Response URL:", `https://docs.google.com/forms/d/${formId}/viewform`);
 
 return { formId, surveyId, title: uniqueTitle };
}

async function getAndStoreResponses(formId, surveyId) {
 const authClient = await auth.getClient();
 
 const forms = google.forms({
   version: 'v1',
   auth: authClient
 });

 const responses = await forms.forms.responses.list({
   formId: formId
 });

 console.log('Raw responses:', JSON.stringify(responses.data, null, 2));

 if (responses.data.responses) {
   console.log(`Found ${responses.data.responses.length} responses`);
   for (const response of responses.data.responses) {
     const answers = {};
     console.log('Processing response:', response);
     
     for (const [questionId, answer] of Object.entries(response.answers)) {
       answers[questionId] = answer.textAnswers?.answers[0].value || 
                           answer.scaleAnswer?.value;
     }

     console.log('Formatted answers:', answers);

     const { data, error } = await supabase
       .from('responses')
       .insert([{
         survey_id: surveyId,
         response_data: answers,
         raw_response: response,
         created_at: new Date(response.lastSubmittedTime)
       }]);

     if (error) console.error('Supabase error:', error);
     else console.log('Stored response:', data);
   }
 } else {
   console.log('No responses found in the form');
 }
}

async function run() {
    try {
      const mode = process.env.MODE;
      console.log('Running in mode:', mode);
   
      if (mode === 'create') {
        // Get only users without recent surveys
        const { data: users, error } = await supabase
        .from('users')
        .select('*');
   
        if (error) throw error;
        console.log(`Found ${users?.length || 0} users to evaluate`);
   
        if (users && users.length > 0) {
          for (const user of users) {
            console.log(`Evaluating user: ${user.email}`);
            const eligibility = await evaluateEligibility(user);
            
            if (eligibility.eligible) {
              console.log(`User ${user.email} is eligible for survey. Reason: ${eligibility.reason}`);
              
              const customerContext = {
                industry: user.industry,
                business_type: user.business_type,
                language: user.language || 'English',
                gender: user.gender,
                purchase_history: user.purchase_history,
                service_interactions: user.service_interactions,
                marketing_engagement: user.marketing_engagement
              };
   
              const questions = await generateSurveyQuestions(customerContext);
              const { formId, surveyId, title } = await createAndShareForm(questions);
              
              if (!formId || !surveyId) {
                console.log(`Failed to create survey for user ${user.email}`);
                continue;
              }
   
              if (eligibility.send_email && user.marketing_opt_in) {
                const surveyUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
                await sendSurveyEmail(surveyUrl, user.email, title);
                console.log(`Survey email sent to ${user.email}`);
              } else {
                console.log(`Survey created but email not sent for ${user.email}. Send email: ${eligibility.send_email}, Marketing opt-in: ${user.marketing_opt_in}`);
              }
   
              const { data: lastSurvey } = await supabase
                .from('user_last_survey')
                .select('surveys_sent')
                .eq('user_id', user.id)
                .single();
   
              const surveys_sent = (lastSurvey?.surveys_sent || 0) + 1;
   
              await supabase
                .from('user_last_survey')
                .upsert([{
                  user_id: user.id,
                  last_survey_date: new Date().toISOString(),
                  surveys_sent: surveys_sent
                }]);
              
              console.log(`Survey history updated for ${user.email}. Total surveys sent: ${surveys_sent}`);
            } else {
              console.log(`User ${user.email} not eligible for survey. Reason: ${eligibility.reason}`);
            }
          }
        }
        
        console.log('Survey creation process completed');
      } else if (mode === 'fetch') {
        const { data: surveys, error } = await supabase
          .from('surveys')
          .select('id, form_id')
          .order('created_at', { ascending: false });
   
        if (error) throw error;
        if (!surveys || surveys.length === 0) {
          console.log('No surveys found');
          return;
        }
   
        console.log(`Found ${surveys.length} surveys. Fetching responses for all...`);
        
        for (const survey of surveys) {
          console.log(`\nProcessing survey with ID: ${survey.id}`);
          await getAndStoreResponses(survey.form_id, survey.id);
        }
      } else {
        console.log('Invalid mode. Use MODE=create or MODE=fetch');
      }
    } catch (error) {
      console.error('Error:', error);
    }
   }

run();