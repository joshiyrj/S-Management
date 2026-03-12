import { Layers } from "lucide-react";
import DataManagementPanel from "../components/DataManagementPanel";

const columns = [
  { key: "name", label: "Name", required: true, placeholder: "e.g. Summer Collection" },
  { key: "sortOrder", label: "Sort", type: "number", placeholder: "e.g. 1" }
];

const modalFields = [
  { key: "name", label: "Name", required: true, placeholder: "e.g. Summer Collection" },
  { key: "sortOrder", label: "Sort Order", type: "number", placeholder: "e.g. 1" },
  { key: "tags", label: "Tags (comma separated)", placeholder: "e.g. featured, new, sale" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Optional description...", fullWidth: true }
];

const csvTemplate = {
  filename: "collections_import_template.csv",
  headers: ["name", "description", "tags", "status", "sortOrder"],
  sampleRows: [
    ["Summer Collection", "Lightweight seasonal fabrics", "summer|cotton", "active", "1"],
    ["Wedding Premium", "Premium festive range", "premium|festive", "active", "2"]
  ]
};

export default function AdminCollections() {
  return (
    <DataManagementPanel
      title="Collections"
      subtitle="Search, filter, create and edit collections."
      apiBase="/api/entities"
      queryKey="collections-panel"
      columns={columns}
      modalFields={modalFields}
      csvTemplate={csvTemplate}
      defaultNewItem={{ name: "", sortOrder: 0, tags: "", description: "", status: "active" }}
      icon={<Layers size={22} />}
      identifierField="name"
      useEntityApi={true}
      entityType="collection"
    />
  );
}
