import { Text } from "ink";
import SelectInput from "ink-select-input";

export interface NamedOption {
  label: string;
  value: string;
}

export function NamedSelect(props: {
  label: string;
  items: NamedOption[];
  value?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <>
      <Text>{props.label}</Text>
      <SelectInput
        items={props.items}
        initialIndex={Math.max(
          0,
          props.items.findIndex(({ value }) => value === props.value),
        )}
        onSelect={(item) => {
          props.onSelect(item.value);
        }}
      />
    </>
  );
}
