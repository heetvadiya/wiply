# WIP Events & Reimbursements App

A modern Next.js application for managing work-in-person (WIP) events, attendance, and reimbursements. Built with a clean, Linear/Notion-inspired UI.

## ✨ Features

- 🔐 **Authentication**: Microsoft Azure AD & Google OAuth integration
- 📅 **Event Management**: Create, view, and manage team events
- 👥 **Attendance Tracking**: Invite colleagues and track confirmations
- 🧾 **Bill Management**: Upload receipts and track expenses
- 💰 **Cost Splitting**: Automatic equal splits across confirmed attendees
- 📊 **Reimbursement Reports**: Export PDF + CSV + receipts for accounting
- 🔍 **Global Search**: Find events and people with ⌘K search
- 🎨 **Modern UI**: Clean, responsive design with dark mode support

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Auth**: NextAuth.js with Azure AD & Google providers
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **File Upload**: UploadThing for receipts and attachments
- **Deployment**: Vercel-ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)
- Microsoft Azure AD application (for OAuth)

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd wip-events-app
npm install
\`\`\`

### 2. Environment Setup

Copy the environment template and fill in your values:

\`\`\`bash
cp env.template .env.local
\`\`\`

Required environment variables:

\`\`\`env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/wip_events"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Microsoft Azure AD (Required)
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# UploadThing (for file uploads)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Organization settings
ALLOWED_EMAIL_DOMAINS="yourcompany.com,example.com"
\`\`\`

### 3. Database Setup

\`\`\`bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 🔧 Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create a new application registration
3. Set redirect URI to: \`http://localhost:3000/api/auth/callback/azure-ad\`
4. Generate a client secret
5. Copy the Application ID, Tenant ID, and client secret to your \`.env.local\`

## 📁 Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── events/            # Event management pages
│   ├── people/            # User directory
│   └── signin/            # Authentication
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configurations
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Database client
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding script
\`\`\`

## 🗃 Database Schema

Key models:
- **User**: Authentication and profile data
- **VipWindow**: Time periods for work-in-person sessions
- **Event**: Group activities and outings
- **Attendance**: User participation in events
- **Bill**: Expense records with receipts
- **BillItem**: Itemized bill entries
- **Attachment**: Receipt/file uploads

## 🔑 API Endpoints

- \`POST /api/events\` - Create new event
- \`GET /api/events\` - List events with filters
- \`GET /api/events/[id]\` - Get event details
- \`PATCH /api/attendances/[id]\` - Update attendance status
- \`GET /api/search\` - Global search
- \`POST /api/auth/[...nextauth]\` - Authentication

## 📱 Usage Guide

### Creating Events

1. Click "New Event" from the dashboard
2. Fill in title, date/time, location, and notes
3. Select the VIP window period
4. Add attendee email addresses
5. Attendees receive invitations to confirm/decline

### Managing Bills

1. Go to event detail page
2. Add bills with subtotal, tax, and tip amounts
3. Upload receipt photos or PDFs
4. Costs automatically split among confirmed attendees

### Exporting Reports

1. Navigate to Exports page
2. Select date range or VIP window
3. Download PDF summary + CSV data + receipt files
4. Submit to accounting for reimbursement

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

\`\`\`bash
# Build command
npm run build

# Start command  
npm start
\`\`\`

### Environment Variables for Production

Update \`NEXTAUTH_URL\` to your production domain:
\`\`\`env
NEXTAUTH_URL="https://your-app.vercel.app"
\`\`\`

## 🔒 Security Features

- Domain-based email allowlist
- Row-level authorization for all data operations
- Secure file upload with type/size validation
- Signed URLs for file downloads
- CSRF protection via NextAuth.js

## 🎨 UI Components

Built with shadcn/ui for consistency:
- **Forms**: React Hook Form + Zod validation
- **Navigation**: Command palette with ⌘K search
- **Feedback**: Toast notifications with Sonner
- **Layouts**: Responsive design with mobile support

## 📋 Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm run db:generate\` - Generate Prisma client
- \`npm run db:push\` - Push schema changes
- \`npm run db:migrate\` - Run database migrations
- \`npm run db:seed\` - Seed database with sample data
- \`npm run db:studio\` - Open Prisma Studio

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error logs and environment details

---

Built with ❤️ for seamless work-in-person event management.