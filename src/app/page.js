'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
 const [message, setMessage] = useState('')

 const handleSubmit = async (e) => {
   e.preventDefault()
   const formData = new FormData(e.currentTarget)
   
   try {
     const userData = {
       email: formData.get('email'),
       personal_info: {
         first_name: formData.get('firstName') || null,
         last_name: formData.get('lastName') || null,
         age: formData.get('age') ? parseInt(formData.get('age')) : null,
         location: formData.get('location') || null,
         joined_date: new Date().toISOString().split('T')[0]
       },
       preferences: {
         product_categories: formData.get('categories') ? 
           formData.get('categories').split(',').map(c => c.trim()) : 
           [],
         communication_preferences: {
           opt_in_marketing: formData.get('optIn') === 'yes'
         }
       },
       purchase_history: {
         total_purchases: parseInt(formData.get('totalPurchases')) || 0,
         purchases_last_30_days: parseInt(formData.get('recentPurchases')) || 0,
         days_since_last_purchase: parseInt(formData.get('daysSinceLastPurchase')) || null,
       },
       interactions: {
         customer_service_last_30_days: parseInt(formData.get('customerServiceContacts')) || 0,
         returns: 0,
         website_visits_last_month: 0
       },
       survey_history: [],
       profile_status: 'active'
     }

     const { error } = await supabase
       .from('users')
       .insert([userData])

     if (error) throw error

     setMessage('User created successfully!')
     e.target.reset()
   } catch (error) {
     setMessage('Error: ' + error.message)
   }
 }

 return (
   <div className="min-h-screen bg-white flex items-center justify-center p-4">
     <div className="w-full max-w-2xl bg-white p-8 rounded-lg">
       <h1 className="text-2xl font-semibold text-black mb-8 text-center">Create New User</h1>
       
       {message && (
         <div className={`p-4 mb-6 rounded text-black ${
           message.includes('Error') ? 'bg-red-100' : 'bg-green-100'
         }`}>
           {message}
         </div>
       )}

       <form onSubmit={handleSubmit} className="space-y-6">
         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Basic Information</h2>
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
         </div>

         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Purchase History & Interactions</h2>
           <input
             type="number"
             name="totalPurchases"
             placeholder="Number of purchases lifetime"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <input
             type="number"
             name="recentPurchases"
             placeholder="Number of purchases last 30 days"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <input
             type="number"
             name="daysSinceLastPurchase"
             placeholder="Days since last purchase"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <input
             type="number"
             name="customerServiceContacts"
             placeholder="Number of customer service contacts last 30 days"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
         </div>

         <div className="space-y-4">
           <h2 className="text-xl font-medium text-black">Preferences</h2>
           <input
             type="text"
             name="categories"
             placeholder="Product Categories (comma-separated)"
             className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
           />
           <div className="space-y-2">
             <label className="text-black font-medium">Marketing Opt-in *</label>
             <div className="flex gap-6">
               <label className="flex items-center">
                 <input
                   type="radio"
                   name="optIn"
                   value="yes"
                   required
                   className="mr-2"
                 />
                 <span className="text-black">Yes</span>
               </label>
               <label className="flex items-center">
                 <input
                   type="radio"
                   name="optIn"
                   value="no"
                   required
                   className="mr-2"
                 />
                 <span className="text-black">No</span>
               </label>
             </div>
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