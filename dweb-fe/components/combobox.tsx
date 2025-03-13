"use client"

import {useState} from "react";
import {Command, CommandInput, CommandList, CommandItem} from "@/components/ui/command";
import {Popover, PopoverTrigger, PopoverContent} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";

export type Option = {
  value: string;
  label: string;
}

export default function ComboboxComponent({options, onSelect, disabled = false}: {
  options: Option[],
  onSelect: (value: string) => void,
  disabled?: boolean,
}) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");

  const handleSelect = (opt: Option) => {
    setSelectedValue(opt.value);
    onSelect(opt.value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full" disabled={disabled}>
          {selectedValue ? options.find((option: Option) => option.value === selectedValue)?.label : "Select option"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2">
        <Command>
          <CommandInput placeholder="Search..." disabled={disabled}/>
          <CommandList>
            {options.map((option: Option) => (
              <CommandItem key={option.value} onSelect={() => handleSelect(option)}>
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
