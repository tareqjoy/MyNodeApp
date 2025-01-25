import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

export function IsAtLeastOneFieldRequired(
  propertyNames: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isAtLeastOneFieldRequired",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [propertyNames],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const relatedProperties = args.constraints[0];
          return relatedProperties.some(
            (property: string) => !!(args.object as any)[property],
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `At least one of the following fields must be set: ${args.constraints[0].join(", ")}`;
        },
      },
    });
  };
}
