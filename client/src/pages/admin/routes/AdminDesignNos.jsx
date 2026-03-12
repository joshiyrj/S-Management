import { Paintbrush } from "lucide-react";
import DataManagementPanel from "../components/DataManagementPanel";

const columns = [
    { key: "designNumber", label: "Design No.", required: true, placeholder: "e.g. D-1001" },
    { key: "title", label: "Title", placeholder: "e.g. Floral Premium" },
    { key: "category", label: "Category", placeholder: "e.g. Saree" },
    { key: "mill", label: "Mill", placeholder: "e.g. Lakshmi Mills" }
];

const modalFields = [
    { key: "designNumber", label: "Design No.", required: true, placeholder: "e.g. D-1001" },
    { key: "title", label: "Title", placeholder: "e.g. Floral Premium" },
    { key: "category", label: "Category", placeholder: "e.g. Saree" },
    { key: "color", label: "Color", placeholder: "e.g. Royal Blue" },
    { key: "mill", label: "Mill", placeholder: "e.g. Lakshmi Mills" },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional notes...", fullWidth: true }
];

const csvTemplate = {
    filename: "design_nos_import_template.csv",
    headers: ["designNumber", "title", "category", "color", "mill", "status", "notes"],
    sampleRows: [
        ["D-1001", "Floral Premium", "Saree", "Royal Blue", "Lakshmi Mills", "active", "Bestseller"],
        ["D-1002", "Cotton Stripe", "Shirting", "Grey", "Saraswati Textiles", "active", ""]
    ]
};

export default function AdminDesignNos() {
    return (
        <DataManagementPanel
            title="Design Nos"
            subtitle="Catalog and organize fabric design patterns."
            apiBase="/api/design-nos"
            queryKey="design-nos"
            columns={columns}
            modalFields={modalFields}
            csvTemplate={csvTemplate}
            defaultNewItem={{
                designNumber: "",
                title: "",
                category: "",
                color: "",
                mill: "",
                status: "active",
                notes: ""
            }}
            icon={<Paintbrush size={22} />}
            identifierField="designNumber"
        />
    );
}
