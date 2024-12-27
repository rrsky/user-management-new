'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import genderDetection from 'gender-detection'

const isValidDate = (date) => {
 if (!date) return true;
 const selectedDate = new Date(date);
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 selectedDate.setHours(0, 0, 0, 0);
 return selectedDate <= today;
};

export default function Home() {
 const [message, setMessage] = useState('')
 const [selectedIndustry, setSelectedIndustry] = useState('')

 const handleSubmit = async (e) => {
   e.preventDefault()
   const formData = new FormData(e.currentTarget)
   
   try {
     const detectedGender = formData.get('firstName') ? 
       genderDetection.detect(formData.get('firstName')) : 
       null;

     const { data: userData, error: userError } = await supabase
       .from('users')
       .insert([{
         email: formData.get('email'),
         marketing_opt_in: formData.get('optIn') === 'yes',
         industry: formData.get('industry'),
         business_type: formData.get('businessType') || null,
         gender: detectedGender,
         language: formData.get('language') || 'English',
         personal_info: {
           first_name: formData.get('firstName') || null,
           last_name: formData.get('lastName') || null,
           age: formData.get('age') ? parseInt(formData.get('age')) : null,
           location: formData.get('location') || null,
         }
       }])
       .select()

     if (userError) throw userError

     const { error: metricsError } = await supabase
       .from('engagement_metrics')
       .insert([{
         user_id: userData[0].id,
         total_purchases: parseInt(formData.get('totalPurchases')) || 0,
         purchase_frequency: formData.get('purchaseFrequency'),
         last_purchase_date: formData.get('lastPurchaseDate') || null,
         cart_abandonment_count: formData.get('cartAbandonment') === 'yes' ? 1 : 0,
         last_purchased_product: formData.get('lastPurchasedProduct') || null,
         last_abandoned_product: formData.get('lastAbandonedProduct') || null
       }])

     if (formData.get('interactionType')) {
       const { error: serviceError } = await supabase
         .from('service_interactions')
         .insert([{
           user_id: userData[0].id,
           type: formData.get('interactionType'),
           status: 'completed'
         }])
       if (serviceError) throw serviceError
     }

     const { error: marketingError } = await supabase
       .from('marketing_engagement')
       .insert([{
         user_id: userData[0].id,
         action: 'open',
         email_id: 'simulation',
         created_at: formData.get('lastEmailInteraction') || new Date().toISOString()
       }])

     if (metricsError || marketingError) throw error

     setMessage('User created successfully!')
     e.target.reset()
     setSelectedIndustry('')
   } catch (error) {
     setMessage('Error: ' + error.message)
   }
 }

 return (
   <div className="min-h-screen bg-white flex items-center justify-center p-4">
     <div className="w-full max-w-2xl bg-white p-8 rounded-lg">
       <h1 className="text-2xl font-semibold text-black mb-8 text-center">Create User</h1>
       
       {message && (
         <div className={`p-4 mb-6 rounded text-black ${
           message.includes('Error') ? 'bg-red-100' : 'bg-green-100'
         }`}>
           {message}
         </div>
       )}

       <form onSubmit={handleSubmit} className="space-y-6">
         {/* Rest of the form remains exactly the same */}
         {/* ... Previous form JSX ... */}
       </form>
     </div>
   </div>
 )
}