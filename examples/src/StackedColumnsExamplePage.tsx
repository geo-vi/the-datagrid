import ExampleDetailPage from "./ExampleDetailPage";
import { getExampleMeta } from "./exampleMeta";
import StackedColumnsExample from "./StackedColumnsExample";

export default function StackedColumnsExamplePage() {
  const example = getExampleMeta("stacked-columns");
  if (!example) throw new Error("Missing stacked columns metadata");

  return (
    <ExampleDetailPage {...example}>
      <StackedColumnsExample />
    </ExampleDetailPage>
  );
}
