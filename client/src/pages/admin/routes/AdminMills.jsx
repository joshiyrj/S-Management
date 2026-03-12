import { Factory } from "lucide-react";
import DataManagementPanel from "../components/DataManagementPanel";

const columns = [
    { key: "name", label: "Name", required: true, placeholder: "e.g. Lakshmi Mills" },
    { key: "location", label: "Location", placeholder: "e.g. Coimbatore" },
    { key: "contactPerson", label: "Contact Person", placeholder: "e.g. Karan" },
    { key: "phone", label: "Phone", placeholder: "e.g. +91 99999 99999" }
];

const modalFields = [
    { key: "name", label: "Name", required: true, placeholder: "e.g. Lakshmi Mills" },
    { key: "location", label: "Location", placeholder: "e.g. Coimbatore" },
    { key: "contactPerson", label: "Contact Person", placeholder: "e.g. Karan" },
    { key: "phone", label: "Phone", placeholder: "e.g. +91 99999 99999" },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional notes...", fullWidth: true }
];

const csvTemplate = {
    filename: "mills_import_template.csv",
    headers: ["name", "location", "contactPerson", "phone", "status", "notes"],
    sampleRows: [
        ["Lakshmi Mills", "Coimbatore", "Karan", "+91 9999999999", "active", "Main supplier"],
        ["Saraswati Textiles", "Surat", "Ravi", "+91 8888888888", "inactive", "Seasonal vendor"]
    ]
};

export default function AdminMills() {
    return (
        <DataManagementPanel
            title="Mills"
            subtitle="Add, edit, and organize mill records."
            apiBase="/api/mills"
            queryKey="mills"
            columns={columns}
            modalFields={modalFields}
            csvTemplate={csvTemplate}
            defaultNewItem={{
                name: "",
                location: "",
                contactPerson: "",
                phone: "",
                status: "active",
                notes: ""
            }}
            icon={<Factory size={22} />}
            identifierField="name"
        />
    );
}
