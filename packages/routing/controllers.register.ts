
export class ControllerRegistry {
  public static readonly controllers: any[] = [];
  public static add(target: any) {
    if (!this.controllers.includes(target)) this.controllers.push(target);
  }
}