import { Language, TenderDocType } from '@/types';
import { defaultTemplates, TemplateContext } from '@/templates/default/templates';
import { englishTemplates } from '@/templates/english/templates';
import { hindiTemplates } from '@/templates/hindi/templates';

type TemplateFn = (context: TemplateContext) => string;

function getLanguageTemplate(docType: TenderDocType, language: Language): TemplateFn | undefined {
  if (language === 'hindi') return hindiTemplates[docType];
  return englishTemplates[docType];
}

export function loadDefaultTemplate(
  docType: TenderDocType,
  language: Language,
  context: TemplateContext
): string {
  const languageTemplate = getLanguageTemplate(docType, language);
  const renderer = languageTemplate || defaultTemplates[docType] || defaultTemplates.quotation_main;
  return renderer(context);
}

export const templateLoader = {
  loadDefaultTemplate,
};
