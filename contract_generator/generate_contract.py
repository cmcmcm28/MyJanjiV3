import os
from docxtpl import DocxTemplate
from datetime import datetime

# --- CONFIGURATION ---
TEMPLATE_FILE = "freelance_contracts.docx"
OUTPUT_DIR = "output"

# Ensure output directory exists
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def get_user_input():
    print("--- Contract Generator ---")
    print("Press ENTER to use the default value in [brackets].\n")
    
    # Helper to clean up input or use default
    def ask(prompt, default):
        value = input(f"{prompt} [{default}]: ").strip()
        return value if value else default

    return {
        # Step 1: Client Info
        'hirer_name': ask("Hire Name", "John Doe"),
        'hirer_id_number': ask("Hire ID Number", "12345678"),
        'effective_date': ask("Effective Date", "1st January 2026"),
        'company_name': ask("Company Name", "TechSol Sdn Bhd"),
        'company_reg_no': ask("Company Reg No", "202401001234"),
        'company_address': ask("Company Address", "Level 30, The Exchange 106, KL"),
        'company_signatory_name': ask("Signatory Name", "Ahmad Albab"),
        'company_signatory_designation': ask("Signatory Role", "Director"),

        # Step 2: Contractor Info
        'contractor_name': ask("Contractor Name", "Sarah Lee"),
        'contractor_id_number': ask("Contractor IC/Passport", "980101-14-1234"),
        'contractor_address': ask("Contractor Address", "15, Jalan Bangsar, KL"),

        # Step 3: Services
        'service_description': ask("Service Description", "Full stack web development."),
        'supervisor_name': ask("Supervisor Name", "Mr. Tan (CTO)"),

        # Step 4: Payment
        'payment_amount': ask("Payment Amount (MYR)", "5,000"),
        'payment_frequency': ask("Payment Frequency", "upon completion"),
        'invoicing_frequency': ask("Invoicing Frequency", "upon completion"),
        'payment_deadline_days': ask("Payment Deadline (Days)", "14"),

        # Step 5: Term
        'start_date': ask("Start Date", "1st January 2026"),
        'end_date': ask("End Date", "31st March 2026"),
        'termination_notice_days': ask("Termination Notice (Days)", "30"),

        # Signatures
        'signing_date': datetime.now().strftime("%d %B %Y")
    }

def generate_document():
    try:
        # Load the template
        doc = DocxTemplate(TEMPLATE_FILE)
        
        # Get data from user (or hardcode it for testing)
        context = get_user_input()

        # Render the tags
        doc.render(context)
        
        # Create unique filename
        filename = f"Contract_{context['company_name']}_{context['contractor_name']}.docx"
        # Remove spaces/special chars from filename for safety
        filename = filename.replace(" ", "_").replace("/", "-")
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        # Save
        doc.save(output_path)
        print(f"\nSUCCESS! Document saved at: {output_path}")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        print("Make sure 'Contracts.docx' is in the same folder and closed (not open in Word).")

if __name__ == "__main__":
    generate_document()