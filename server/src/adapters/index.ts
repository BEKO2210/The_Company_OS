// Barrel export of all adapters
export { BaseAdapter } from './baseAdapter';
export {
  EmailAdapter,
  type EmailMessage,
  type EmailAttachment,
  type SendEmailInput,
} from './emailAdapter';
export {
  LinkedInAdapter,
  type LinkedInPost,
  type LinkedInProfile,
  type LinkedInConnection,
  type LinkedInMessage,
} from './linkedInAdapter';
export {
  BankingAdapter,
  type BankAccount,
  type BankTransaction,
  type AccountBalance,
} from './bankingAdapter';
export {
  AccountingAdapter,
  type Invoice,
  type InvoiceItem,
  type CreateInvoiceInput,
} from './accountingAdapter';
export {
  GitHubAdapter,
  type GitHubRepo,
  type GitHubPullRequest,
  type GitHubFile,
  type CreatePullRequestInput,
} from './gitHubAdapter';
export {
  HostingAdapter,
  type Deployment,
  type Project,
} from './hostingAdapter';
export {
  CalendarAdapter,
  type CalendarEvent,
  type Attendee,
  type CreateEventInput,
  type FreeSlot,
} from './calendarAdapter';
export {
  FreelancerPlatformAdapter,
  type Freelancer,
  type Hire,
  type Milestone,
  type RatingInput,
  type SearchFilters,
} from './freelancerPlatformAdapter';
