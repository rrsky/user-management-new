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
   console.log('Form submitted')
   const formData = new FormData(e.currentTarget)
   
   try {
     console.log('Processing form data')
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

     if (metricsError) throw metricsError

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

     if (marketingError) throw marketingError

     console.log('Form processed successfully')
     setMessage('User created successfully!')
     e.target.reset()
     setSelectedIndustry('')
   } catch (error) {
     console.error('Submission error:', error)
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
         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Business Information</h2>
           <div>
             <label className="block text-black font-medium mb-2">Industry *</label>
             <select
               name="industry"
               required
               onChange={(e) => setSelectedIndustry(e.target.value)}
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             >
               <option value="">Select Industry</option>
               <option value="eCommerce">eCommerce</option>
               <option value="Travel Bookings">Travel Bookings</option>
               <option value="Beauty Bookings">Beauty Bookings</option>
               <option value="Services">Services</option>
             </select>
           </div>
           
           {selectedIndustry === 'eCommerce' && (
             <div>
               <label className="block text-black font-medium mb-2">Type of Business *</label>
               <select
                 name="businessType"
                 required
                 className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
               >
                 <option value="">Select Type</option>
                 <option value="Food & Drinks">Food & Drinks</option>
                 <option value="Home">Home</option>
                 <option value="Fashion">Fashion</option>
                 <option value="Electronics">Electronics</option>
                 <option value="Other">Other</option>
               </select>
             </div>
           )}
         </div>

         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Customer Details</h2>
           <input
             type="email"
             name="email"
             placeholder="Email *"
             required
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <div className="grid grid-cols-2 gap-4">
             <input
               type="text"
               name="firstName"
               placeholder="First Name"
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             />
             <input
               type="text"
               name="lastName"
               placeholder="Last Name"
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             />
           </div>
           <input
             type="number"
             name="age"
             placeholder="Age"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <input
             type="text"
             name="location"
             placeholder="Location"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <input
             type="text"
             name="language"
             placeholder="Preferred Language"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
         </div>

         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Purchase History</h2>
           <input
             type="number"
             name="totalPurchases"
             placeholder="Total number of purchases"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <input
             type="text"
             name="lastPurchasedProduct"
             placeholder="Name of last purchased product"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <select
             name="purchaseFrequency"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           >
             <option value="">Select Purchase Frequency</option>
             <option value="increasing">Increasing</option>
             <option value="stable">Stable</option>
             <option value="decreasing">Decreasing</option>
           </select>
           <div>
             <label className="block text-black font-medium mb-2">Last Purchase Date</label>
             <input
               type="date"
               name="lastPurchaseDate"
               max={new Date().toISOString().split('T')[0]}
               onChange={(e) => {
                 if (!isValidDate(e.target.value)) {
                   e.target.value = '';
                   setMessage('Please select a date in the past or today');
                 }
               }}
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             />
           </div>
           <div className="space-y-2">
             <label className="text-black font-medium">Cart abandonment in the last 7 days</label>
             <div className="flex gap-6">
               <label className="flex items-center">
                 <input type="radio" name="cartAbandonment" value="yes" className="mr-2"/>
                 <span className="text-black">Yes</span>
               </label>
               <label className="flex items-center">
                 <input type="radio" name="cartAbandonment" value="no" className="mr-2"/>
                 <span className="text-black">No</span>
               </label>
             </div>
           </div>
           <input
             type="text"
             name="lastAbandonedProduct"
             placeholder="Name of last abandoned product"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
         </div>

         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Service Interactions</h2>
           <div className="space-y-2">
             <label className="text-black font-medium">Most Recent Interaction</label>
             <div className="space-y-2">
               {['support', 'complaint', 'return', 'warranty'].map((type) => (
                 <label key={type} className="flex items-center">
                   <input
                     type="radio"
                     name="interactionType"
                     value={type}
                     className="mr-2"
                   />
                   <span className="text-black capitalize">{type}</span>
                 </label>
               ))}
             </div>
           </div>
         </div>

         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Marketing Engagement</h2>
           <div className="space-y-2 mb-4">
             <label className="text-black font-medium">Marketing Opt-in *</label>
             <div className="flex gap-6">
               <label className="flex items-center">
                 <input type="radio" name="optIn" value="yes" required className="mr-2"/>
                 <span className="text-black">Yes</span>
               </label>
               <label className="flex items-center">
                 <input type="radio" name="optIn" value="no" required className="mr-2"/>
                 <span className="text-black">No</span>
               </label>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <input
               type="number"
               name="emailOpens"
               placeholder="Email opens (30 days)"
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             />
             <input
               type="number"
               name="emailClicks"
               placeholder="Email clicks (30 days)"
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             />
           </div>
           <div>
             <label className="block text-black font-medium mb-2">Last Email Opened</label>
             <input
               type="date"
               name="lastEmailInteraction"
               max={new Date().toISOString().split('T')[0]}
               onChange={(e) => {
                 if (!isValidDate(e.target.value)) {
                   e.target.value = '';
                   setMessage('Please select a date in the past or today');
                 }
               }}
               className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
             />
           </div>
         </div>

         <button
           type="submit"
           className="w-full p-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
         >
           Create User
         </button>
       </form>
     </div>
   </div>
 )
}