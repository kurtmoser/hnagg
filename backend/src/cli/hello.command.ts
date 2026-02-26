import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'hello',
  description: 'A test command that prints a greeting',
})
export class HelloCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Hello from CLI!');
  }
}
