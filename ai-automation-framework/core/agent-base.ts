export interface AgentContext {
  url?: string;
  browser?: any;
  pages?: string[];
  currentPage?: string;
  domData?: any;
  navigationData?: any;
  formData?: any;
  integrationData?: any;
  testResults?: any[];
  screenshots?: any[];
  [key: string]: any;
}

export interface Agent {
  name: string;
  execute(input: AgentContext): Promise<AgentContext>;
}

export abstract class BaseAgent implements Agent {
  constructor(public name: string) {}
  
  abstract execute(input: AgentContext): Promise<AgentContext>;
}
