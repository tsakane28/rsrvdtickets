# RSRVD Tickets - Event Ticketing Application

RSRVD Tickets is a comprehensive event ticketing system built with Next.js and Firebase, allowing users to create events, manage registrations, and distribute tickets with QR codes.

![Event ticketing system](https://github.com/dha-stix/eventtiz/assets/67129211/c7282244-6b1c-49e0-918e-1bfc1097a26c)

## 🌟 Features

### Event Management
- **Create Events**: Easily create events with details like title, date, time, venue, description, and optional notes to attendees
- **Event Flyer Upload**: Upload and compress event flyer images up to 5MB
- **Dashboard View**: View and manage all your created events from a single dashboard
- **Event Deletion**: Remove events that have concluded or are no longer needed

### Registration & Tickets
- **Custom Registration Links**: Generate unique registration links that can be shared with potential attendees
- **Attendee Management**: Track registrations and view all attendees for each event
- **Registration Control**: Disable registration when you've reached your desired attendee count
- **Ticket Validation**: Verify attendee tickets using the unique passcodes or QR codes

### Ticketing System
- **Email Tickets**: Automatic email delivery of tickets to registrants with event details
- **PDF Tickets**: Professional PDF tickets with event information, QR codes, and optional event flyer
- **QR Code Generation**: Each ticket includes a unique QR code for easy verification at the event
- **Mobile-Friendly Design**: Tickets are optimized for both mobile and desktop viewing

### Payment Integration
- **PayPal Integration**: Accept payments before tickets are generated
- **Sandbox Testing**: Test payment flows using PayPal Sandbox environment
- **Payment Verification**: Verify payment status before generating tickets

### User Experience
- **Authentication**: Secure email and password authentication for event creators
- **Responsive Design**: Fully responsive interfaces for all screen sizes
- **Real-time Feedback**: Progress indicators and clear messaging during operations
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🚀 Live Demo
[View Live Version](https://rsrvdtickets.vercel.app/)

## 📝 How-to Guide

## 💻 Installation & Setup

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- A Firebase account

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourname/rsrvdtickets.git
cd rsrvdtickets
```

### Step 2: Install Dependencies
```bash
npm install
# or
yarn install
```

### Step 3: Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password
3. Create a Firestore Database
4. Set up Storage for event flyers
5. In Project settings > General > Your apps, add a new Web app
6. Copy the Firebase config values

### Step 4: Environment Variables
Create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Email sending configuration (for ticket delivery)
EMAIL_HOST=your-smtp-host
EMAIL_PORT=your-smtp-port
EMAIL_USER=your-email-address
EMAIL_PASS=your-email-password
```

### Step 5: Run the Development Server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Step 6: Build for Production
```bash
npm run build
# or
yarn build
```

## 🔧 Troubleshooting

### Image Upload Issues
If image uploads are taking too long or failing:
- Check your Firebase Storage rules
- Ensure your internet connection is stable
- The app automatically compresses images over 1MB for better performance

### Payment Integration
For PayPal integration:
- Use the Sandbox environment for testing
- Create test accounts in the PayPal Developer Dashboard
- Get your Sandbox merchant ID and update it in the code

## 🛠️ Technologies Used

### Frontend
- [Next.js 13](https://nextjs.org/docs) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [React Table](https://react-table-v7.tanstack.com) - Headless UI for tables
- [React Icons](https://react-icons.github.io/react-icons) - Icon library
- [React Copy To Clipboard](https://github.com/nkbt/react-copy-to-clipboard) - Clipboard functionality
- [React Toastify](https://fkhadra.github.io/react-toastify/introduction) - Toast notifications

### Backend Services
- [Firebase v9](https://console.firebase.google.com)
  - Authentication - User authentication
  - Firestore - Database
  - Storage - File storage
- [Nodemailer](https://nodemailer.com/) - Email sending
- [PDFKit](https://pdfkit.org/) - PDF generation
- [QRCode](https://github.com/soldair/node-qrcode) - QR code generation

## 🤝 Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License
This project is licensed under the MIT License.
