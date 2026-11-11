/**
 * Matches a complete Tekton variable reference such as `$(params.name)`, `$(params['name'])`,
 * `$(tt.params.name)` or `$(context.pipelineRun.name)`. A bare `$(` or `$(word)` is not a reference.
 */
const VARIABLE_REF = /\$\([A-Za-z_][\w-]*(?:\.[\w.-]+|\[[^\]]*\])+\)/;

export const hasVariableReference = (value: string): boolean => VARIABLE_REF.test(value);
