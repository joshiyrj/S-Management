import { BoxSelect } from "lucide-react";
import DataManagementPanel from "../components/DataManagementPanel";

const columns = [
    { key: "label", label: "Label", required: true, placeholder: "e.g. 500 Meters" },
    { key: "value", label: "Value", type: "number", required: true, placeholder: "e.g. 500" },
    { key: "unit", label: "Unit", placeholder: "e.g. meters" },
    { key: "category", label: "Category", placeholder: "e.g. Fabric" }
];

const modalFields = [
    { key: "label", label: "Label", required: true, placeholder: "e.g. 500 Meters" },
    { key: "value", label: "Value", type: "number", required: true, placeholder: "e.g. 500" },
    { key: "unit", label: "Unit", placeholder: "e.g. meters" },
    { key: "category", label: "Category", placeholder: "e.g. Fabric" },
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional notes...", fullWidth: true }
];

const csvTemplate = {
    filename: "quantities_import_template.csv",
    headers: ["label", "value", "unit", "category", "status", "notes"],
    sampleRows: [
        ["Roll Pack", "24", "pcs", "Packing", "active", "Standard roll pack"],
        ["Fabric Length", "500", "meters", "Fabric", "active", "Bulk stock benchmark"]
    ]
};

export default function AdminQuantities() {
    return (
        <DataManagementPanel
            title="Quantities"
            subtitle="Define standard quantities and units."
            apiBase="/api/quantities"
            queryKey="quantities"
            columns={columns}
            modalFields={modalFields}
            csvTemplate={csvTemplate}
            defaultNewItem={{
                label: "",
                value: 0,
                unit: "pcs",
                category: "",
                status: "active",
                notes: ""
            }}
            icon={<BoxSelect size={22} />}
            identifierField="label"
        />
    );
}
