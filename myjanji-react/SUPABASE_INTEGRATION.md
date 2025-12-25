# Supabase Integration Summary

## ✅ Completed Tasks

### 1. Dependencies Installed
- ✅ `@supabase/supabase-js` package installed

### 2. Configuration Files Created
- ✅ `src/lib/supabase.js` - Supabase client initialization
- ✅ Service files created in `src/services/supabase/`:
  - `authService.js` - Authentication operations
  - `userService.js` - User profile operations
  - `contractService.js` - Contract CRUD operations
  - `storageService.js` - File upload operations

### 3. Context Files Updated
- ✅ `src/context/AuthContext.jsx` - Now uses Supabase for user data
  - Loads users from Supabase on mount
  - Falls back to dummy data if Supabase fails
  - Maintains same API for backward compatibility
  
- ✅ `src/context/ContractContext.jsx` - Now uses Supabase for contracts
  - `addContract()` - Creates contract in Supabase
  - `updateContract()` - Updates contract in Supabase
  - `signContract()` - Uploads signature to storage and updates contract
  - `loadUserContracts()` - Loads contracts for a user from Supabase
  - Falls back to dummy data if Supabase fails

### 4. Page Updates
- ✅ `DashboardPage.jsx` - Loads contracts from Supabase when user logs in
- ✅ `ContractsPage.jsx` - Loads contracts from Supabase when user logs in
- ✅ `SignContractPage.jsx` - Uploads signature to Supabase storage
- ✅ `CreateContractPage.jsx` - Uploads creator signature to Supabase storage

---

## ⚠️ Manual Steps Required

### 1. Create `.env` File
**IMPORTANT:** You need to manually create the `.env` file in `myjanji-react/` directory:

```env
VITE_SUPABASE_URL=https://umldjcyvmtjtjyyhspif.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_-pTAB3wbjcbHlVCmzYjKlg_KHN4VyqW
```

**Note:** The `.env` file is already in `.gitignore`, so it won't be committed to Git.

### 2. Restart Development Server
After creating the `.env` file, restart your Vite dev server:
```bash
npm run dev
```

---

## 📋 Database Schema Mapping

### Frontend → Database Field Mapping

#### Users:
- `id` → `user_id`
- `name` → `name`
- `ic` → `ic_hash` (note: this is a hash, not the actual IC)
- `email` → `email`
- `phone` → `phone`
- `avatar` → `avatar`

#### Contracts:
- `id` → `contract_id`
- `name` → `contract_name`
- `topic` → `contract_topic`
- `userId` → `created_user_id`
- `accepteeId` → `acceptee_user_id`
- `status` → `status`
- `templateType` → `template_type`
- `formData` → `form_data` (JSONB)
- `dueDate` → `due_date`
- `creatorSignature` → `creator_signature_url`
- `accepteeSignature` → `acceptee_signature_url`
- `creatorNfcVerified` → `creator_nfc_verified`
- `creatorFaceVerified` → `creator_face_verified`
- `accepteeNfcVerified` → `acceptee_nfc_verified`
- `accepteeFaceVerified` → `acceptee_face_verified`

---

## 🔄 Data Flow

### User Login Flow:
1. User selects user from list (or logs in)
2. `AuthContext.login()` called
3. Fetches user from Supabase via `userService.getProfile()`
4. Falls back to dummy data if Supabase fails
5. Sets `currentUser` state

### Contract Loading Flow:
1. User logs in → `DashboardPage` mounts
2. `useEffect` calls `loadUserContracts(userId)`
3. `ContractContext.loadUserContracts()` fetches from Supabase
4. Updates `contracts` state
5. Falls back to dummy data if Supabase fails

### Contract Creation Flow:
1. User fills form and signs
2. `addContract()` called
3. Creates contract in Supabase
4. Uploads signature to `signatures` bucket
5. Updates contract with signature URL
6. Updates local state

### Contract Signing Flow:
1. User verifies NFC + Face
2. User signs contract
3. `signContract()` called
4. Converts base64 signature to file
5. Uploads to `signatures` bucket
6. Updates contract in Supabase with signature URL
7. Updates contract status to 'Ongoing' if acceptee signs

---

## 🧪 Testing Checklist

### Basic Connection:
- [ ] Create `.env` file with Supabase credentials
- [ ] Restart dev server
- [ ] Check browser console for Supabase connection errors
- [ ] Verify users load from Supabase (or fallback to dummy data)

### User Operations:
- [ ] Login with existing user
- [ ] Verify user data loads from Supabase
- [ ] Check if `availableUsers` loads from Supabase

### Contract Operations:
- [ ] Create a new contract
- [ ] Verify contract appears in Supabase
- [ ] Verify signature uploads to storage
- [ ] Sign a contract as acceptee
- [ ] Verify signature uploads and contract updates
- [ ] Check contract status changes correctly

### Storage:
- [ ] Verify signature images upload to `signatures` bucket
- [ ] Verify signature URLs are stored in contracts table
- [ ] Test PDF upload (when implemented)

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Create `.env` file in `myjanji-react/` directory with the credentials above.

### Issue: "Table doesn't exist" errors
**Solution:** 
- Verify tables are created in Supabase
- Check table names match exactly (case-sensitive)
- Verify RLS policies are set correctly

### Issue: "Permission denied" errors
**Solution:**
- Check Row Level Security (RLS) policies in Supabase
- Verify storage bucket policies are set
- Check if user is authenticated (if using auth)

### Issue: Data not loading
**Solution:**
- Check browser console for errors
- Verify Supabase URL and key are correct
- Check network tab for failed requests
- System falls back to dummy data, so app should still work

### Issue: Signatures not uploading
**Solution:**
- Check storage bucket exists: `signatures`
- Verify storage policies allow uploads
- Check file size limits
- Verify user ID is passed correctly

---

## 📝 Notes

1. **Backward Compatibility:** All changes maintain the same API, so existing components should work without modification.

2. **Fallback Behavior:** If Supabase fails, the app falls back to dummy data, so it will still function during development.

3. **Async Operations:** Some functions are now async (`addContract`, `updateContract`, `signContract`), but they're called with `await` in the pages.

4. **Data Transformation:** The service files handle transformation between frontend structure and database structure automatically.

5. **Error Handling:** All service functions have try-catch blocks and return consistent error formats.

---

## 🚀 Next Steps

1. **Create `.env` file** (see Manual Steps above)
2. **Restart dev server**
3. **Test basic operations** (login, view contracts)
4. **Test contract creation** with signature upload
5. **Test contract signing** flow
6. **Verify data in Supabase dashboard**
7. **Check storage buckets** for uploaded files

---

## 📚 Files Modified

### Created:
- `src/lib/supabase.js`
- `src/services/supabase/authService.js`
- `src/services/supabase/userService.js`
- `src/services/supabase/contractService.js`
- `src/services/supabase/storageService.js`

### Modified:
- `src/context/AuthContext.jsx`
- `src/context/ContractContext.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/ContractsPage.jsx`
- `src/pages/SignContractPage.jsx`
- `src/pages/CreateContractPage.jsx`
- `package.json` (added @supabase/supabase-js)

---

## 🔐 Security Notes

- `.env` file is in `.gitignore` (won't be committed)
- Supabase uses RLS (Row Level Security) for data access
- Storage buckets have policies for file access
- Publishable key is safe to use in frontend (it's public by design)

---

**Integration Status:** ✅ Complete (pending `.env` file creation)

