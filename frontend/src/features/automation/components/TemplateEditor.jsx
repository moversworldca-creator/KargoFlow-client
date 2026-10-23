import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import CommunicationTemplates from '../../settings/components/CommunicationTemplates';

const TemplateEditor = () => {
  const { itemId = 'new' } = useParams();
  const location = useLocation();
  const isTemplateLibraryRoute = /\/automation\/templates\/?$/.test(location.pathname);
  const builderRouteItemId = isTemplateLibraryRoute
    ? null
    : itemId && itemId !== 'new'
      ? itemId
      : 'new';

  return (
    <div className="template-editor">
      <CommunicationTemplates
        basePath="/automation/templates"
        closePath="/automation"
        builderRouteView={isTemplateLibraryRoute ? '' : 'builder'}
        builderRouteItemId={builderRouteItemId}
        builderRouteState={location.state || null}
      />
    </div>
  );
};

export default TemplateEditor;
