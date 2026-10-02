import ReactDataGrid, { type TypeColumns } from "../../src/main";

// The last column is narrower than its header, so the grid widens it to fit.
const columns: TypeColumns = [
  { name: "id", header: "ID", defaultWidth: 80 },
  { name: "description", header: "Description", defaultFlex: 1 },
  { name: "advice", header: "Spam advice", defaultWidth: 60 },
];

const rows = [
  { id: 1, description: "Route to the main mail server", advice: "None" },
  { id: 2, description: "Route for the archive", advice: "Tag" },
];

export default function LastColumnHeaderCompatPage() {
  return (
    <>
      <div data-testid="last-column-header-block">
        <ReactDataGrid
          idProperty="id"
          columns={columns}
          dataSource={rows}
          style={{ height: 200 }}
        />
      </div>

      {/* A flex item at the default `min-width: auto` grows with a table wider
          than the grid, and the grid then measures the wider host. */}
      <div style={{ display: "flex" }} data-testid="last-column-header-flex">
        <div style={{ flex: 1 }}>
          <ReactDataGrid
            idProperty="id"
            columns={columns}
            dataSource={rows}
            style={{ height: 200 }}
          />
        </div>
      </div>
    </>
  );
}
