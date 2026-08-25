import { useState } from "react";
import { Text, useInput } from "ink";
import type { NamedOption } from "./named-select.js";
import { matchesKeybinding } from "../keybindings.js";

export function NamedMultiSelect(props: {
  label: string;
  items: NamedOption[];
  selected: string[];
  onSubmit: (values: string[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(new Set(props.selected));
  useInput((input, key) => {
    if (matchesKeybinding("previous", input, key) || matchesKeybinding("previousVim", input, key))
      setIndex((current) => Math.max(0, current - 1));
    if (matchesKeybinding("next", input, key) || matchesKeybinding("nextVim", input, key))
      setIndex((current) => Math.min(props.items.length - 1, current + 1));
    if (matchesKeybinding("toggleSelection", input, key))
      setSelected((current) => toggled(current, props.items[index]?.value));
    if (matchesKeybinding("activate", input, key) && selected.size > 0)
      props.onSubmit([...selected]);
  });
  return (
    <>
      <Text>{props.label}</Text>
      {props.items.map((item, itemIndex) => (
        <Text key={item.value} inverse={itemIndex === index}>
          {selected.has(item.value) ? "[x]" : "[ ]"} {item.label}
        </Text>
      ))}
      <Text dimColor>Up/Down move · Space toggle · Enter continue</Text>
    </>
  );
}

function toggled(current: Set<string>, value: string | undefined): Set<string> {
  const next = new Set(current);
  if (!value) return next;
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
