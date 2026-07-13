import ExampleDetailPage from "./ExampleDetailPage";
import InovuaParityCompatPage from "./InovuaParityCompatPage";
import { getExampleMeta } from "./exampleMeta";

export default function InovuaParityExamplePage() {
  const example = getExampleMeta("inovua-parity");

  if (!example) {
    throw new Error("Missing example metadata for inovua-parity");
  }

  return (
    <ExampleDetailPage
      title={example.title}
      summary={example.summary}
      details={example.details}
      sourcePath={example.sourcePath}
      sourceCode={example.sourceCode}
      tags={example.tags}
    >
      <InovuaParityCompatPage />
    </ExampleDetailPage>
  );
}
