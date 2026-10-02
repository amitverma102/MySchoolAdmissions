export interface FormFieldCondition {
  dependsOn: string; // e.g. "grade", "hasSiblingInSchool", "requiresTransport"
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isTruthy' | 'isFalsy';
  value: string;
  action?: 'show' | 'hide';
}

export interface FormField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'file' | 'textarea';
  options?: string[];
  isRequired: boolean;
  placeholder?: string;
  helpText?: string;
  section?: string;
  condition?: FormFieldCondition;
}

export interface FormSchema {
  id: string;
  formTitle: string;
  gradeApplicable: string;
  description: string;
  isActive: boolean;
  fields: FormField[];
}

/**
 * Extracts a numeric value from grade labels, e.g.:
 * "Grade 1" -> 1
 * "Grade 6" -> 6
 * "Grade 11 (Science)" -> 11
 * "Pre-Nursery", "Kindergarten" -> 0
 */
export function parseGradeNumber(gradeStr?: string): number {
  if (!gradeStr) return 0;
  const match = String(gradeStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Evaluates whether a conditional visibility rule is satisfied
 * given the current form values and grade level.
 */
export function evaluateCondition(
  condition: FormFieldCondition | undefined,
  currentValues: Record<string, any>,
  currentGrade?: string
): boolean {
  if (!condition || !condition.dependsOn) {
    return true; // No condition means always visible
  }

  const targetKey = condition.dependsOn.trim();
  const targetLower = targetKey.toLowerCase();
  let actualVal: any = undefined;

  if (targetLower === 'grade' || targetLower === 'gradeapplyingfor' || targetLower === 'gradeinterested') {
    actualVal = currentGrade || currentValues.gradeApplyingFor || currentValues.grade || '';
  } else {
    actualVal = currentValues[targetKey];
    if (actualVal === undefined) {
      // Case-insensitive lookup fallback
      const matchKey = Object.keys(currentValues).find(k => k.toLowerCase() === targetLower);
      if (matchKey) {
        actualVal = currentValues[matchKey];
      }
    }
  }

  const op = condition.operator || 'equals';
  const expected = condition.value ?? '';
  let isMet = false;

  switch (op) {
    case 'equals':
      isMet = String(actualVal ?? '').trim().toLowerCase() === String(expected).trim().toLowerCase();
      break;

    case 'notEquals':
      isMet = String(actualVal ?? '').trim().toLowerCase() !== String(expected).trim().toLowerCase();
      break;

    case 'contains':
      isMet = String(actualVal ?? '').toLowerCase().includes(String(expected).toLowerCase());
      break;

    case 'greaterThan': {
      if (targetLower === 'grade' || targetLower === 'gradeapplyingfor' || targetLower === 'gradeinterested') {
        const actualNum = parseGradeNumber(String(actualVal));
        const expectedNum = parseGradeNumber(expected) || Number(expected);
        isMet = actualNum > expectedNum;
      } else {
        const actualNum = Number(actualVal);
        const expectedNum = Number(expected);
        isMet = !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
      }
      break;
    }

    case 'lessThan': {
      if (targetLower === 'grade' || targetLower === 'gradeapplyingfor' || targetLower === 'gradeinterested') {
        const actualNum = parseGradeNumber(String(actualVal));
        const expectedNum = parseGradeNumber(expected) || Number(expected);
        isMet = actualNum < expectedNum;
      } else {
        const actualNum = Number(actualVal);
        const expectedNum = Number(expected);
        isMet = !isNaN(actualNum) && !isNaN(expectedNum) && actualNum < expectedNum;
      }
      break;
    }

    case 'isTruthy':
      isMet = Boolean(actualVal && actualVal !== 'false' && actualVal !== '0');
      break;

    case 'isFalsy':
      isMet = !actualVal || actualVal === 'false' || actualVal === '0';
      break;

    default:
      isMet = true;
  }

  return condition.action === 'hide' ? !isMet : isMet;
}

/**
 * Generates a human-friendly flowchart logic condition explanation.
 */
export function getConditionDescription(
  condition: FormFieldCondition | undefined,
  fields: FormField[] = []
): string {
  if (!condition || !condition.dependsOn) {
    return 'Always Visible (Standard Form Step)';
  }

  const parentField = fields.find(
    f => f.fieldName.toLowerCase() === condition.dependsOn.toLowerCase() || f.id === condition.dependsOn
  );
  const parentName = condition.dependsOn.toLowerCase() === 'grade' 
    ? 'Grade Level' 
    : parentField?.label || condition.dependsOn;

  let opText = '';
  switch (condition.operator) {
    case 'equals':
      opText = 'equals';
      break;
    case 'notEquals':
      opText = 'is not';
      break;
    case 'contains':
      opText = 'contains';
      break;
    case 'greaterThan':
      opText = '>';
      break;
    case 'lessThan':
      opText = '<';
      break;
    case 'isTruthy':
      return `Visible IF [${parentName}] is selected/checked`;
    case 'isFalsy':
      return `Visible IF [${parentName}] is empty/unchecked`;
    default:
      opText = condition.operator;
  }

  return `Visible IF [${parentName}] ${opText} "${condition.value}"`;
}

// Standard fields already captured in the core application form sections
const STANDARD_FIELD_KEYS = new Set([
  'applicantname',
  'studentname',
  'fullname',
  'childname',
  'name',
  'gradeapplyingfor',
  'grade',
  'class',
  'gradeinterested',
  'gender',
  'sex',
  'dateofbirth',
  'dob',
  'birthdate',
  'academicyear',
  'session',
  'school',
  'institution',
  'institutionid',
  'campus',
  'campusid',
  'parentname',
  'fathername',
  'mothername',
  'guardianname',
  'relationship',
  'guardianrelationship',
  'contactphone',
  'phone',
  'mobile',
  'phonenumber',
  'contactnumber',
  'contactemail',
  'email',
  'emailaddress',
  'previousschool',
  'previousschoolname',
  'lastschool',
  'lastschoolattended',
  'schoolattended',
  'studentphoto',
  'photo',
  'photograph',
  'avatar',
  'picture',
  'status',
  'notes',
  'specialnotes',
  'remarks',
  'comments',
  'intakenotes'
]);

const STANDARD_LABEL_PATTERNS = [
  /^student\s*(full)?\s*name/i,
  /^applicant\s*name/i,
  /^grade(\s*applying(\s*for)?)?$/i,
  /^gender$/i,
  /^date\s*of\s*birth/i,
  /^dob$/i,
  /^parent(\s*\/\s*guardian)?\s*name/i,
  /^father('?s)?\s*name/i,
  /^mother('?s)?\s*name/i,
  /^guardian\s*name/i,
  /^relationship(\s*to\s*student)?$/i,
  /^contact\s*phone/i,
  /^phone(\s*number)?$/i,
  /^mobile(\s*number)?$/i,
  /^(contact\s*)?email(\s*address)?$/i,
  /^previous\s*school/i,
  /^student\s*photo/i,
  /^photo(graph)?$/i,
  /^special\s*notes/i,
  /^intake\s*notes/i,
  /^academic\s*year$/i,
  /^institution(\s*\/\s*school)?$/i,
  /^campus$/i
];

export function isDuplicateField(field: FormField): boolean {
  const nameKey = (field.fieldName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nameKey && STANDARD_FIELD_KEYS.has(nameKey)) {
    return true;
  }
  const labelTrimmed = (field.label || '').trim();
  if (STANDARD_LABEL_PATTERNS.some(p => p.test(labelTrimmed))) {
    return true;
  }
  return false;
}
