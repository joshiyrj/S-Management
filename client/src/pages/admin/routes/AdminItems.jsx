import { useQuery } from "@tanstack/react-query";
import { Boxes, FolderPlus } from "lucide-react";
import { api } from "../../../lib/api";
import DataManagementPanel from "../components/DataManagementPanel";

const columns = [
  { key: "name", label: "Name", required: true, placeholder: "e.g. Premium Item" },
  { key: "sortOrder", label: "Sort", type: "number", placeholder: "e.g. 1" }
];

const modalFields = [
  { key: "name", label: "Name", required: true, placeholder: "e.g. Premium Item" },
  { key: "sortOrder", label: "Sort Order", type: "number", placeholder: "e.g. 1" },
  { key: "tags", label: "Tags (comma separated)", placeholder: "e.g. featured, new, sale" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Optional description...", fullWidth: true }
];

const csvTemplate = {
  filename: "items_import_template.csv",
  headers: ["name", "description", "tags", "collectionName", "status", "sortOrder"],
  sampleRows: [
    ["Premium Satin", "Silky premium satin fabric", "satin|premium", "Wedding Premium", "active", "1"],
    ["Cotton Basic", "Daily use cotton fabric", "cotton|basic", "Summer Collection", "active", "2"]
  ]
};

function CollectionLinkSection({ modalData, updateModalField }) {
  const collectionsQuery = useQuery({
    queryKey: ["collections-list"],
    queryFn: async () => (await api.get("/api/entities/collections")).data,
  });

  return (
    <div className="card card-pad mt-1">
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <FolderPlus size={18} />
        Collection Link
      </div>
      <div className="text-xs text-slate-500 mt-1">
        Choose an existing collection or type a new one.
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Existing</label>
          <select
            className="select"
            value={modalData.collectionId || ""}
            onChange={(e) => {
              const id = e.target.value || "";
              const selected = (collectionsQuery.data || []).find((c) => c._id === id);
              updateModalField("collectionId", id);
              if (selected) updateModalField("collectionName", selected.name);
            }}
          >
            <option value="">Unassigned</option>
            {(collectionsQuery.data || []).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Or Create New</label>
          <input
            className="input"
            value={modalData.collectionName || ""}
            onChange={(e) => {
              updateModalField("collectionName", e.target.value);
              updateModalField("collectionId", "");
            }}
            placeholder="e.g. Summer Collection"
          />
          <div className="text-[11px] text-slate-500 mt-1">If this name does not exist, it will be created.</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminItems() {
  return (
    <DataManagementPanel
      title="Items"
      subtitle="Search, filter, create and edit items."
      apiBase="/api/entities"
      queryKey="items-panel"
      columns={columns}
      modalFields={modalFields}
      csvTemplate={csvTemplate}
      defaultNewItem={{ name: "", sortOrder: 0, tags: "", description: "", status: "active", collectionId: "", collectionName: "" }}
      icon={<Boxes size={22} />}
      identifierField="name"
      useEntityApi={true}
      entityType="item"
      showCollectionColumn={true}
      renderExtraModal={(props) => <CollectionLinkSection {...props} />}
    />
  );
}
