"use client";

/*
 * TextInput intentionally keeps the value-first callbacks and imperative
 * class instance used by @inovua/reactdatagrid-community. A native input's
 * event-first onChange contract is not interchangeable with that API.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";

import "./style.css";

const DEFAULT_ROOT_CLASS_NAME = "inovua-react-toolkit-text-input";

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export type TextInputValue = any;

export type TextInputChangeEvent = any;

export type TextInputChangeHandler = (
  value: TextInputValue,
  event?: TextInputChangeEvent
) => void;

export type TextInputClearIconProps = {
  fill?: string;
  height?: number | string;
  width?: number | string;
};

export type TextInputClearButtonConfig = {
  clearButtonClassName?: string;
  clearButtonColor?: string;
  clearButtonSize?: number | readonly [number, number] | null;
  clearButtonStyle?: React.CSSProperties;
};

export type TextInputInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> & {
  onChange?: TextInputChangeHandler;
  [key: string]: any;
};

export type TextInputWrapperProps = React.HTMLAttributes<HTMLDivElement> & {
  [key: string]: any;
};

export type TextInputProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  acceptClearToolFocus?: boolean;
  autoFocus?: boolean;
  clearButtonClassName?: string;
  clearButtonColor?: string;
  clearButtonSize?: number | readonly [number, number] | null;
  clearButtonStyle?: React.CSSProperties;
  defaultValue?: TextInputValue;
  disabled?: boolean;
  enableClearButton?: boolean;
  hidden?: boolean;
  inputProps?: TextInputInputProps | null;
  maxLength?: number;
  minLength?: number;
  name?: string;
  onChange?: TextInputChangeHandler;
  placeholder?: string | null;
  readOnly?: boolean;
  renderClearIcon?: (
    props: TextInputClearIconProps
  ) => React.ReactNode | undefined;
  required?: boolean;
  rootClassName?: string;
  rtl?: boolean;
  size?: number;
  stopChangePropagation?: boolean | null;
  theme?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  value?: TextInputValue;
  wrapperProps?: TextInputWrapperProps;

  // The original component was declared with untyped props. Keep migration
  // code source-compatible while documenting the supported surface above.
  [key: string]: any;
};

export type TypeTextInputProps = TextInputProps;

type TextInputState = {
  focused: boolean;
  value: TextInputValue;
};

function isControlled(props: TextInputProps): boolean {
  return props.value !== undefined;
}

/**
 * Inovua-compatible text input.
 *
 * A class component is intentional: existing consumers keep a component ref
 * and call `focus()` or `setValue()` directly.
 */
export class TextInput extends React.Component<TextInputProps, TextInputState> {
  static defaultProps: Partial<TextInputProps> = {
    acceptClearToolFocus: false,
    clearButtonSize: 10,
    enableClearButton: true,
    hidden: false,
    rootClassName: DEFAULT_ROOT_CLASS_NAME,
    stopChangePropagation: true,
    theme: "default-light",
    type: "text",
  };

  private field: HTMLInputElement | null = null;

  constructor(props: TextInputProps) {
    super(props);
    // The upstream class auto-binds its public methods. Bind the prototype
    // lookup (rather than replacing it with a class field) so subclasses can
    // still override these two render hooks.
    this.renderClearButton = this.renderClearButton.bind(this);
    this.renderClearButtonWrapper = this.renderClearButtonWrapper.bind(this);
  }

  state: TextInputState = {
    focused: false,
    value: this.props.defaultValue == null ? "" : this.props.defaultValue,
  };

  private setFieldRef = (field: HTMLInputElement | null): void => {
    this.field = field;
  };

  handleChange = (
    value: TextInputValue,
    event?: TextInputChangeEvent
  ): void => {
    this.setValue(value, event);
  };

  focus = (): void => {
    this.field?.focus();
  };

  setValue = (value: TextInputValue, event?: TextInputChangeEvent): void => {
    if (!isControlled(this.props)) {
      this.setState({ value });
    }

    // Inovua invokes the nested callback first. Some consumers depend on this
    // ordering to update controlled state before observing the root callback.
    this.props.inputProps?.onChange?.(value, event);
    this.props.onChange?.(value, event);
  };

  private handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    if (this.props.stopChangePropagation) {
      event.stopPropagation();
    }

    this.handleChange(event.currentTarget.value, event);
  };

  private handleClearButtonMouseDown = (
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    // Retain input focus so clearing does not create a blur/focus cycle.
    event.preventDefault();
  };

  handleClearButtonClick = (event?: any): void => {
    void event;
    this.setState({ focused: true });
    // The upstream clear callback does not forward the button click event.
    this.setValue("");
    this.focus();
  };

  onClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!this.state.focused) {
      this.focus();
    }

    this.props.wrapperProps?.onClick?.(event);
  };

  onBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
    this.setState({ focused: false });
    this.props.onBlur?.(event);
  };

  onFocus = (event: React.FocusEvent<HTMLDivElement>): void => {
    this.setState({ focused: true });
    this.props.onFocus?.(event);
  };

  renderClearIcon = (iconProps: TextInputClearIconProps): React.ReactNode => {
    const customIcon = this.props.renderClearIcon?.({ ...iconProps });
    if (customIcon !== undefined) return customIcon;

    return (
      <svg
        aria-hidden="true"
        focusable="false"
        style={{ ...iconProps, color: iconProps.fill }}
        viewBox="0 0 10 10"
      >
        <path
          d="M1 1l8 8m0-8L1 9"
          fill="none"
          fillRule="evenodd"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.33"
        />
      </svg>
    );
  };

  renderClearButton(config: TextInputClearButtonConfig): React.ReactNode {
    const {
      clearButtonClassName,
      clearButtonColor,
      clearButtonSize,
      clearButtonStyle,
    } = config;
    const iconSize = clearButtonSize
      ? Array.isArray(clearButtonSize)
        ? { width: clearButtonSize[0], height: clearButtonSize[1] }
        : { width: clearButtonSize, height: clearButtonSize }
      : {};
    const iconProps: TextInputClearIconProps = {
      ...iconSize,
      ...(clearButtonColor ? { fill: clearButtonColor } : {}),
    };

    return (
      <button
        aria-label="Clear input"
        className={joinClassNames(
          clearButtonClassName,
          "tdg-text-input__clear-button"
        )}
        onClick={this.handleClearButtonClick}
        onMouseDown={this.handleClearButtonMouseDown}
        style={clearButtonStyle}
        tabIndex={this.props.acceptClearToolFocus ? 0 : -1}
        type="button"
      >
        {this.renderClearIcon(iconProps)}
      </button>
    );
  }

  renderClearButtonWrapper(fieldProps: any): React.ReactNode {
    const {
      clearButtonClassName,
      clearButtonColor,
      clearButtonSize = 10,
      clearButtonStyle,
      enableClearButton = true,
      rootClassName = DEFAULT_ROOT_CLASS_NAME,
    } = this.props;
    const value = isControlled(this.props)
      ? this.props.value
      : this.state.value;
    // Preserve the toolkit's observable loose-empty check. In particular,
    // controlled `0` and `false` values do not expose a clear tool.
    const emptyValue = value == null || value == "";
    const showClearButton =
      enableClearButton &&
      !emptyValue &&
      !fieldProps.disabled &&
      !fieldProps.readOnly;

    return (
      <div
        aria-hidden={showClearButton ? undefined : "true"}
        className={joinClassNames(
          `${rootClassName}__clear-button-wrapper`,
          "tdg-text-input__clear-button-wrapper",
          !showClearButton
            ? `${rootClassName}__clear-button-wrapper--hidden`
            : undefined,
          !showClearButton
            ? "tdg-text-input__clear-button-wrapper--hidden"
            : undefined
        )}
      >
        {this.renderClearButton({
          clearButtonClassName: joinClassNames(
            `${rootClassName}__clear-button`,
            clearButtonClassName
          ),
          clearButtonColor,
          clearButtonSize,
          clearButtonStyle,
        })}
      </div>
    );
  }

  render(): React.ReactNode {
    const {
      acceptClearToolFocus = false,
      autoFocus,
      className,
      clearButtonClassName,
      clearButtonColor,
      clearButtonSize = 10,
      clearButtonStyle,
      defaultValue: _defaultValue,
      disabled,
      enableClearButton = true,
      hidden,
      inputProps: passedInputProps,
      maxLength,
      minLength,
      name,
      onBlur: _onBlur,
      onChange: _onChange,
      onFocus: _onFocus,
      placeholder,
      readOnly,
      renderClearIcon: _renderClearIcon,
      required,
      rootClassName = DEFAULT_ROOT_CLASS_NAME,
      rtl,
      size,
      stopChangePropagation: _stopChangePropagation,
      style,
      theme = "default-light",
      type = "text",
      value: controlledValue,
      wrapperProps,
      ...rootDomProps
    } = this.props;
    void acceptClearToolFocus;
    void clearButtonClassName;
    void clearButtonColor;
    void clearButtonSize;
    void clearButtonStyle;
    void _defaultValue;
    void _onBlur;
    void _onChange;
    void _onFocus;
    void _renderClearIcon;
    void _stopChangePropagation;

    // The upstream component treats an explicitly null `inputProps` exactly
    // like an omitted object. This matters for older spread-based call sites.
    const inputProps = passedInputProps || {};
    const {
      className: inputClassName,
      onChange: _inputOnChange,
      stopChangePropagation: _inputStopChangePropagation,
      ...inputDomProps
    } = inputProps;
    void _inputOnChange;
    void _inputStopChangePropagation;
    const value = isControlled(this.props) ? controlledValue : this.state.value;
    const fieldDisabled = disabled || inputDomProps.disabled || false;
    const fieldReadOnly = readOnly || inputDomProps.readOnly || false;

    return (
      <div
        {...rootDomProps}
        {...wrapperProps}
        className={joinClassNames(
          rootClassName,
          className,
          rtl ? `${rootClassName}--rtl` : `${rootClassName}--ltr`,
          theme ? `${rootClassName}--theme-${theme}` : undefined,
          enableClearButton
            ? `${rootClassName}--enable-clear-button`
            : undefined,
          this.state.focused ? `${rootClassName}--focused` : undefined,
          fieldDisabled ? `${rootClassName}--disabled` : undefined,
          "tdg-text-input",
          rtl ? "tdg-text-input--rtl" : "tdg-text-input--ltr",
          this.state.focused ? "tdg-text-input--focused" : undefined,
          fieldDisabled ? "tdg-text-input--disabled" : undefined
        )}
        onBlur={this.onBlur}
        onClick={this.onClick}
        onFocus={this.onFocus}
        style={style}
      >
        <input
          {...inputDomProps}
          ref={this.setFieldRef}
          autoFocus={autoFocus || inputDomProps.autoFocus}
          className={joinClassNames(
            `${rootClassName}__input`,
            "tdg-text-input__input",
            inputClassName
          )}
          disabled={fieldDisabled}
          hidden={hidden || inputDomProps.hidden}
          maxLength={maxLength ?? inputDomProps.maxLength}
          minLength={minLength ?? inputDomProps.minLength}
          name={name || inputDomProps.name}
          onChange={this.handleInputChange}
          placeholder={placeholder || inputDomProps.placeholder}
          readOnly={fieldReadOnly}
          required={required || inputDomProps.required}
          size={size ?? inputDomProps.size ?? 1}
          type={type}
          value={value == null ? "" : value}
        />

        {this.renderClearButtonWrapper({
          disabled: fieldDisabled,
          readOnly: fieldReadOnly,
        })}
      </div>
    );
  }
}

export default TextInput;
