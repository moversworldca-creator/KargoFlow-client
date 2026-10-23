import { createDocumentBlockRenderer } from '../../../../../../../shared/template-builder/components/DocumentBlock.jsx';
import { getBuilderBlock, downloadFile } from "../../../../../services/api";
const { DocumentBlock, BackendWidgetPreview } = createDocumentBlockRenderer({ getBuilderBlock: (...args) => getBuilderBlock(...args), downloadFile: (...args) => downloadFile(...args) });
export { BackendWidgetPreview };
export default DocumentBlock;
