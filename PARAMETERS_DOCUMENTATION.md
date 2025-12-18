# MyJanji V3 - Parameters Documentation

This document provides a comprehensive explanation of all parameters, data structures, and configurations used throughout the MyJanji V3 codebase. This will help team members understand the code structure and data flow.

---

## Table of Contents

1. [Context Parameters](#context-parameters)
2. [Data Structures](#data-structures)
3. [Component Props](#component-props)
4. [Function Parameters](#function-parameters)
5. [State Variables](#state-variables)
6. [Route Parameters](#route-parameters)
7. [Configuration Objects](#configuration-objects)

---

## Context Parameters

### AuthContext (`src/context/AuthContext.jsx`)

The AuthContext provides authentication state and functions throughout the application.

#### Context Value Properties

| Parameter | Type | Description |
|-----------|------|-------------|
| `currentUser` | `Object \| null` | The currently logged-in user object. Contains user information (id, name, ic, avatar, email, phone). Set to `null` when no user is logged in. |
| `isAuthenticated` | `boolean` | Indicates whether a user is currently authenticated. `true` when user is logged in, `false` otherwise. |
| `isFaceVerified` | `boolean` | Indicates whether the current user has completed face verification. Used for biometric authentication flow. |
| `login` | `Function(userId: string)` | Function to log in a user. Takes a `userId` string parameter and sets the current user. Returns `true` if login successful, `false` otherwise. |
| `logout` | `Function()` | Function to log out the current user. Clears all authentication state including `currentUser`, `isAuthenticated`, and `isFaceVerified`. |
| `verifyFace` | `Function()` | Function to mark face verification as complete. Sets `isFaceVerified` to `true`. |
| `resetFaceVerification` | `Function()` | Function to reset face verification status. Sets `isFaceVerified` to `false`. |
| `availableUsers` | `Array<User>` | Array of all available users in the system. Used for demo login and user selection. |

---

### ContractContext (`src/context/ContractContext.jsx`)

The ContractContext manages all contract-related state and operations.

#### Context Value Properties

| Parameter | Type | Description |
|-----------|------|-------------|
| `contracts` | `Array<Contract>` | Array of all contracts in the system. See [Contract Object](#contract-object) structure below. |
| `templates` | `Array<Template>` | Array of all available contract templates. Flat list of templates from all categories. |
| `categories` | `Array<Category>` | Array of contract categories, each containing related templates. See [Category Object](#category-object) below. |
| `stats` | `Object` | Global statistics object containing counts of contracts by status. See [Stats Object](#stats-object) below. |
| `addContract` | `Function(contract: Object)` | Creates a new contract. Takes a contract object (without id), generates a unique ID (`CNT-{timestamp}`), adds `signatureDate`, and adds it to the contracts array. Returns the newly created contract. |
| `updateContract` | `Function(contractId: string, updates: Object)` | Updates an existing contract. Takes `contractId` and an `updates` object containing fields to update. Merges updates with existing contract data. |
| `getContractById` | `Function(contractId: string)` | Retrieves a single contract by its ID. Returns the contract object or `undefined` if not found. Case-insensitive matching. |
| `getContractsByUserId` | `Function(userId: string)` | Gets all contracts where the specified user is the creator (`userId` matches contract's `userId`). |
| `getPendingContractsForUser` | `Function(userId: string)` | Gets all contracts where the specified user is the acceptee and status is 'Pending'. Used to show contracts awaiting user's signature. |
| `getAllContractsForUser` | `Function(userId: string)` | Gets all contracts where the user is either the creator or acceptee. Returns contracts where `userId` or `accepteeId` matches. |
| `signContract` | `Function(contractId: string, signature: string, isAcceptee: boolean)` | Signs a contract. `signature` is a base64 image string. If `isAcceptee` is `true`, sets `accepteeSignature` and changes status to 'Ongoing'. Otherwise, sets `creatorSignature`. |
| `declineContract` | `Function(contractId: string, declinedBy: string, declineReason?: string)` | Declines a contract. Sets status to 'Declined', records `declinedBy` (userId), `declinedAt` (timestamp), and optional `declineReason`. |
| `markAsBreached` | `Function(contractId: string, breachReason?: string)` | Marks a contract as breached. Sets status to 'Breached', records `breachedAt` (timestamp), and optional `breachReason`. Used in Enforcement page. |

---

## Data Structures

### User Object

Represents a user in the system.

```javascript
{
  id: string,           // Unique user identifier (e.g., 'USER-001')
  name: string,         // Full name of the user
  ic: string,          // Malaysian IC number (e.g., '901212-10-5599')
  avatar: string,      // URL path to user's avatar image
  email: string,       // User's email address
  phone: string        // User's phone number (e.g., '+60 12-345 6789')
}
```

**Example:**
```javascript
{
  id: 'USER-001',
  name: 'SpongeBob SquarePants',
  ic: '901212-10-5599',
  avatar: '/images/mykad_sponge.png',
  email: 'spongebob@bikinibottom.sea',
  phone: '+60 12-345 6789'
}
```

---

### Contract Object

Represents a digital contract between two parties.

```javascript
{
  id: string,                    // Unique contract ID (e.g., 'CNT-001')
  name: string,                  // Contract name/title
  topic: string,                 // Brief description/category
  status: string,                // Contract status: 'Ongoing', 'Pending', 'Completed', 'Breached', 'Declined'
  userId: string,                // ID of contract creator
  accepteeId: string,            // ID of contract acceptee (other party)
  signatureDate: Date,           // Date when contract was created/signed
  dueDate: Date,                 // Contract expiration/completion date
  templateType: string,           // Template type (e.g., 'ITEM_BORROW', 'FREELANCE_JOB')
  formData: Object | null,        // Template-specific form data (varies by template type)
  creatorSignature: string | null, // Base64 image string of creator's signature
  accepteeSignature: string | null, // Base64 image string of acceptee's signature
  
  // Optional fields (added when contract is declined)
  declinedBy?: string,            // User ID who declined the contract
  declinedAt?: Date,              // Timestamp when contract was declined
  declineReason?: string,         // Reason for declining (optional)
  
  // Optional fields (added when contract is breached)
  breachedAt?: Date,              // Timestamp when contract was marked as breached
  breachReason?: string,          // Reason for breach (optional)
  
  // Optional fields (added during creation)
  nfcVerification?: Object,       // NFC scan verification data
  faceVerified?: boolean          // Whether face verification was completed
}
```

**Status Values:**
- `'Pending'`: Contract created but not yet signed by acceptee
- `'Ongoing'`: Contract is active and both parties have signed
- `'Completed'`: Contract has been fulfilled/completed
- `'Breached'`: Contract terms have been violated
- `'Declined'`: Contract was rejected by acceptee

---

### Category Object

Represents a category of contract templates.

```javascript
{
  id: string,              // Category identifier (e.g., 'items_assets')
  name: string,            // Display name (e.g., 'Items & Assets')
  description: string,     // Category description
  icon: string,            // Icon name (for Lucide React icons)
  color: string,           // Tailwind gradient classes (e.g., 'from-blue-500 to-cyan-500')
  templates: Array<Template> // Array of templates in this category
}
```

---

### Template Object

Represents a contract template type.

```javascript
{
  id: string,              // Template identifier (e.g., 'VEHICLE_USE', 'FRIENDLY_LOAN')
  name: string,            // Display name (e.g., 'Vehicle Borrowing')
  description: string,     // Template description
  icon: string,            // Icon name (for Lucide React icons)
  fields: Array<string>    // Array of field names required for this template
}
```

**Available Template Types:**
- `'VEHICLE_USE'`: Vehicle borrowing contract
- `'ITEM_BORROW'`: Item borrowing contract
- `'BILL_SPLIT'`: Bill splitting agreement
- `'FRIENDLY_LOAN'`: Personal loan between friends/family
- `'FREELANCE_JOB'`: Freelance work agreement
- `'SALE_DEPOSIT'`: Sale with deposit agreement

---

### Stats Object

Global contract statistics.

```javascript
{
  total: number,      // Total number of contracts
  ongoing: number,    // Number of contracts with 'Ongoing' status
  pending: number,   // Number of contracts with 'Pending' status
  completed: number, // Number of contracts with 'Completed' status
  breached: number,  // Number of contracts with 'Breached' status
  declined: number   // Number of contracts with 'Declined' status
}
```

---

### FormData Object

Template-specific form data. Structure varies by template type.

#### Vehicle Use Template
```javascript
{
  model: string,      // Vehicle model
  plate: string,     // License plate number
  startDate: string, // Start date (ISO format)
  endDate: string,   // End date (ISO format)
  fuel: string       // Fuel arrangement (e.g., 'Full-to-Full')
}
```

#### Item Borrow Template
```javascript
{
  item: string,       // Item name/description
  condition: string,  // Item condition (e.g., 'Brand New')
  returnDate: string, // Expected return date
  value: string      // Item value/price
}
```

#### Friendly Loan Template
```javascript
{
  amount: number,    // Loan amount
  purpose: string,   // Purpose of loan
  date: string       // Repayment date
}
```

#### Freelance Job Template
```javascript
{
  task: string,      // Task description
  deadline: string,  // Task deadline
  price: number,     // Service price
  deposit: number    // Deposit amount
}
```

#### Sale Deposit Template
```javascript
{
  item: string,      // Item being sold
  price: number,     // Total price
  deposit: number,    // Deposit amount
  dueDate: string    // Payment due date
}
```

---

## Component Props

### Header Component (`src/components/layout/Header.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'MyJanji'` | The header title text displayed on the left side |
| `showBack` | `boolean` | `false` | Whether to show the back button |
| `showNotifications` | `boolean` | `true` | Whether to show the notifications bell icon |
| `showLogout` | `boolean` | `false` | Whether to show the logout button |
| `rightContent` | `ReactNode` | `undefined` | Custom content to display on the right side of header |

---

### BottomNav Component (`src/components/layout/BottomNav.jsx`)

No props. Uses React Router's `useLocation` and `useNavigate` hooks internally.

**Navigation Items:**
- `/dashboard` - Home icon
- `/contracts` - FileText icon
- `/create-contract` - PlusCircle icon (main button, centered)
- `/profile` - User icon
- `/enforcement` - Flag icon

---

### Card Component (`src/components/ui/Card.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Content to display inside the card |
| `className` | `string` | `''` | Additional CSS classes |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Padding size for the card |
| `hover` | `boolean` | `false` | Whether to enable hover scale effect |
| `onClick` | `Function()` | `undefined` | Click handler function |

---

### Button Component (`src/components/ui/Button.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Button text/content |
| `variant` | `'primary' \| 'outline' \| 'ghost'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `icon` | `LucideIcon` | `undefined` | Icon component from lucide-react |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position of icon relative to text |
| `fullWidth` | `boolean` | `false` | Whether button should take full width |
| `disabled` | `boolean` | `false` | Whether button is disabled |
| `loading` | `boolean` | `false` | Whether to show loading spinner |
| `onClick` | `Function()` | `undefined` | Click handler function |
| `className` | `string` | `''` | Additional CSS classes |

---

### Modal Component (`src/components/ui/Modal.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | Required | Whether modal is visible |
| `onClose` | `Function()` | Required | Function called when modal should close |
| `title` | `string` | `''` | Modal title text |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Modal width size |
| `children` | `ReactNode` | Required | Modal content |

---

### ContractCard Component (`src/components/contracts/ContractCard.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `contract` | `Contract` | Required | Contract object to display |
| `onClick` | `Function(contract)` | `undefined` | Click handler, receives contract object |
| `showArrow` | `boolean` | `true` | Whether to show arrow icon on the right |

---

### ContractList Component (`src/components/contracts/ContractList.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `contracts` | `Array<Contract>` | Required | Array of contracts to display |
| `onContractClick` | `Function(contract)` | `undefined` | Click handler for each contract |
| `emptyMessage` | `string` | `'No contracts found'` | Message to show when contracts array is empty |

---

### ContractForm Component (`src/components/contracts/ContractForm.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `template` | `Template` | Required | Template object defining form fields |
| `formData` | `Object` | Required | Current form data object |
| `onChange` | `Function(formData)` | Required | Called when form data changes |
| `acceptees` | `Array<User>` | `[]` | Array of available users to select as acceptee |
| `onSubmit` | `Function()` | `undefined` | Called when form is submitted |
| `submitLabel` | `string` | `'Continue'` | Text for submit button |

---

### NFCScanner Component (`src/components/features/NFCScanner.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `Function(data)` | Required | Called when NFC scan succeeds. Receives scanned data object. |
| `onError` | `Function(error)` | `undefined` | Called when NFC scan fails |
| `onSkip` | `Function()` | `undefined` | Called when user skips NFC scanning |
| `title` | `string` | `'Scan Your MyKad'` | Title text displayed |
| `description` | `string` | `'Place your MyKad...'` | Description text displayed |
| `allowSkip` | `boolean` | `true` | Whether to show skip button |

**NFC Data Object (returned by onSuccess):**
```javascript
{
  cardType: string,        // 'MyKad'
  icNumber: string,        // IC number from card
  name: string,           // Full name from card
  address: string,        // Address from card
  dateOfBirth: string,    // Date of birth (ISO format)
  gender: string,         // 'M' or 'F'
  citizenship: string,     // Citizenship status
  issueDate: string,      // Card issue date
  expiryDate: string,     // Card expiry date
  chipId: string,         // Unique chip identifier
  timestamp: string       // ISO timestamp of scan
}
```

---

### WebcamCapture Component (`src/components/features/WebcamCapture.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCapture` | `Function(imageSrc)` | `undefined` | Called when photo is captured. Receives base64 image string. |
| `onVerify` | `Function(imageSrc)` | `undefined` | Called when user clicks verify. Receives base64 image string. |
| `isVerifying` | `boolean` | `false` | Whether face verification is in progress |
| `verificationResult` | `Object \| null` | `null` | Verification result object with success status |
| `showOverlay` | `boolean` | `true` | Whether to show face guide overlay |

---

### SignaturePad Component (`src/components/features/SignaturePad.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSave` | `Function(signature)` | Required | Called when signature is saved. Receives base64 image string. |
| `width` | `number` | `400` | Canvas width in pixels |
| `height` | `number` | `200` | Canvas height in pixels |

---

### PDFPreviewModal Component (`src/components/features/PDFPreviewModal.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | Required | Whether modal is visible |
| `onClose` | `Function()` | Required | Function to close modal |
| `contract` | `Contract` | `undefined` | Contract object (if previewing existing contract) |
| `creator` | `User` | `undefined` | Creator user object |
| `acceptee` | `User` | `undefined` | Acceptee user object |
| `templateType` | `string` | `undefined` | Template type identifier |
| `formData` | `Object` | `undefined` | Form data for template |
| `title` | `string` | `'Contract Preview'` | Modal title |
| `allowDownload` | `boolean` | `false` | Whether to show download button |

---

## Function Parameters

### ContractContext Functions

#### `addContract(contract)`
**Parameters:**
- `contract` (Object): Contract object without `id`. Should include:
  - `name`: string
  - `topic`: string
  - `userId`: string
  - `accepteeId`: string
  - `status`: string (typically 'Pending')
  - `dueDate`: Date
  - `templateType`: string
  - `formData`: Object | null
  - `creatorSignature`: string | null
  - `accepteeSignature`: string | null (typically null)
  - Optional: `nfcVerification`, `faceVerified`

**Returns:** New contract object with generated `id` and `signatureDate`.

---

#### `updateContract(contractId, updates)`
**Parameters:**
- `contractId` (string): ID of contract to update
- `updates` (Object): Object containing fields to update. Can include any contract property.

**Example:**
```javascript
updateContract('CNT-001', { status: 'Completed' })
```

---

#### `signContract(contractId, signature, isAcceptee)`
**Parameters:**
- `contractId` (string): ID of contract to sign
- `signature` (string): Base64 encoded image string of signature
- `isAcceptee` (boolean): `true` if acceptee is signing, `false` if creator is signing

**Behavior:**
- If `isAcceptee` is `true`: Sets `accepteeSignature` and changes status to 'Ongoing'
- If `isAcceptee` is `false`: Sets `creatorSignature` only

---

#### `declineContract(contractId, declinedBy, declineReason)`
**Parameters:**
- `contractId` (string): ID of contract to decline
- `declinedBy` (string): User ID of person declining
- `declineReason` (string, optional): Reason for declining

**Behavior:** Sets status to 'Declined', records `declinedBy`, `declinedAt`, and `declineReason`.

---

#### `markAsBreached(contractId, breachReason)`
**Parameters:**
- `contractId` (string): ID of contract to mark as breached
- `breachReason` (string, optional): Reason for breach

**Behavior:** Sets status to 'Breached', records `breachedAt` and `breachReason`.

---

### AuthContext Functions

#### `login(userId)`
**Parameters:**
- `userId` (string): User ID to log in (e.g., 'USER-001')

**Returns:** `true` if login successful, `false` if user not found.

**Behavior:** Sets `currentUser`, `isAuthenticated` to `true`.

---

#### `logout()`
**Parameters:** None

**Behavior:** Clears `currentUser`, sets `isAuthenticated` and `isFaceVerified` to `false`.

---

## State Variables

### DashboardPage State

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `activeTab` | `string` | `'all'` | Currently selected tab filter ('all', 'ongoing', 'pending', 'completed', 'breached', 'declined') |
| `searchQuery` | `string` | `''` | Search input text for filtering contracts |
| `selectedContract` | `Contract \| null` | `null` | Currently selected contract for details modal |
| `showQRModal` | `boolean` | `false` | Whether QR code modal is visible |
| `showDetailsModal` | `boolean` | `false` | Whether contract details modal is visible |
| `activeFilter` | `'active' \| 'pending' \| 'issues' \| null` | `null` | Active button filter (Total, Active, Pending, Issues) |

---

### CreateContractPage State

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `currentStep` | `number` | `0` | Current step in multi-step form (0-6) |
| `selectedCategory` | `Category \| null` | `null` | Selected contract category |
| `selectedTemplate` | `Template \| null` | `null` | Selected contract template |
| `formData` | `Object` | `{}` | Form input data (varies by template) |
| `creatorSignature` | `string \| null` | `null` | Base64 signature image |
| `nfcData` | `Object \| null` | `null` | NFC scan verification data |
| `faceVerified` | `boolean` | `false` | Whether face verification completed |
| `showPdfPreview` | `boolean` | `false` | Whether PDF preview modal is visible |
| `hasConsented` | `boolean` | `false` | Whether user consented to contract terms |

---

### EnforcementPage State

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `searchQuery` | `string` | `''` | Search input for filtering contracts |
| `selectedContract` | `Contract \| null` | `null` | Contract selected for breach flagging |
| `showBreachModal` | `boolean` | `false` | Whether breach confirmation modal is visible |
| `breachReason` | `string` | `''` | User-entered reason for breach |

---

## Route Parameters

### React Router Routes

| Route | Parameter | Description |
|-------|-----------|-------------|
| `/sign-contract/:contractId` | `contractId` | Contract ID extracted from URL. Used to fetch contract for signing. |
| `/contract-details/:contractId` | `contractId` | Contract ID for viewing details (if implemented) |

**Example Usage:**
```javascript
// Navigate to sign contract page
navigate(`/sign-contract/${contract.id}`)

// Access parameter in component
const { contractId } = useParams()
```

---

## Configuration Objects

### Status Colors (`src/utils/dummyData.js`)

Maps contract status to Tailwind CSS background color classes.

```javascript
{
  'Ongoing': 'bg-status-ongoing',    // Green
  'Pending': 'bg-status-pending',     // Orange
  'Completed': 'bg-status-completed', // Gray
  'Breached': 'bg-status-breached',   // Red
  'Declined': 'bg-gray-500'           // Gray
}
```

---

### Status Text Colors (`src/utils/dummyData.js`)

Maps contract status to Tailwind CSS text color classes.

```javascript
{
  'Ongoing': 'text-status-ongoing',
  'Pending': 'text-status-pending',
  'Completed': 'text-status-completed',
  'Breached': 'text-status-breached',
  'Declined': 'text-gray-600'
}
```

---

### Contract Statuses (`src/utils/dummyData.js`)

Constants for contract status values.

```javascript
{
  ONGOING: 'Ongoing',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  BREACHED: 'Breached',
  DECLINED: 'Declined'
}
```

---

### Video Constraints (WebcamCapture)

Configuration for webcam video stream.

```javascript
{
  width: 480,           // Video width in pixels
  height: 360,          // Video height in pixels
  facingMode: 'user'    // Use front-facing camera
}
```

---

## Common Patterns

### Filtering Contracts

Contracts are typically filtered using a combination of:
1. **Status filter**: Filter by contract status
2. **User filter**: Filter by userId or accepteeId
3. **Search filter**: Filter by name, topic, or ID

**Example:**
```javascript
const filteredContracts = useMemo(() => {
  let filtered = userContracts
  
  // Filter by status
  if (activeTab !== 'all') {
    filtered = filtered.filter(c => c.status === statusMap[activeTab])
  }
  
  // Filter by search
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.topic.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    )
  }
  
  return filtered
}, [userContracts, activeTab, searchQuery])
```

---

### Contract Status Flow

```
Pending → (Acceptee signs) → Ongoing → Completed
   ↓
Declined (if acceptee declines)

Ongoing → Breached (if terms violated)
```

---

## Notes

1. **User IDs**: Always use the format `'USER-XXX'` where XXX is a 3-digit number.

2. **Contract IDs**: Auto-generated as `'CNT-{timestamp}'` when creating new contracts.

3. **Signatures**: Stored as base64 encoded image strings (data URLs).

4. **Dates**: Use JavaScript `Date` objects. Display formatted dates using `toLocaleDateString('en-MY')`.

5. **Status Values**: Always use exact string values ('Ongoing', 'Pending', etc.) - case-sensitive.

6. **Template Types**: Use uppercase with underscores (e.g., 'VEHICLE_USE', 'FRIENDLY_LOAN').

---

## Quick Reference

### Getting User Contracts
```javascript
const { getAllContractsForUser } = useContracts()
const userContracts = getAllContractsForUser(currentUser.id)
```

### Getting Pending Contracts
```javascript
const { getPendingContractsForUser } = useContracts()
const pending = getPendingContractsForUser(currentUser.id)
```

### Creating a Contract
```javascript
const { addContract } = useContracts()
const newContract = addContract({
  name: 'Contract Name',
  topic: 'Description',
  userId: currentUser.id,
  accepteeId: 'USER-002',
  status: 'Pending',
  // ... other fields
})
```

### Signing a Contract
```javascript
const { signContract } = useContracts()
signContract(contractId, signatureBase64, true) // true = acceptee signing
```

### Marking as Breached
```javascript
const { markAsBreached } = useContracts()
markAsBreached(contractId, 'Reason for breach')
```

---

**Last Updated:** 2025-01-XX
**Version:** 3.0.0

