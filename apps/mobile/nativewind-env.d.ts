// NativeWind v4 className prop augmentation
// Declared directly to avoid nested node_modules resolution issues with
// react-native-css-interop being inside nativewind/node_modules.
// export {} makes this file a module so declare module blocks are augmentations,
// not ambient declarations that would shadow the real react-native types.
export {};

declare module "react-native" {
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }
  interface ImageBackgroundProps {
    imageClassName?: string;
  }
  interface TextInputProps {
    className?: string;
    placeholderClassName?: string;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface InputAccessoryViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface StatusBarProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface PressableProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface KeyboardAvoidingViewProps extends ViewProps {
    contentContainerClassName?: string;
  }
  interface ScrollViewProps {
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }
  interface ModalBaseProps {
    presentationClassName?: string;
  }
}

declare module "@react-native/virtualized-lists" {
  export interface VirtualizedListWithoutRenderItemProps<ItemT> {
    ListFooterComponentClassName?: string;
    ListHeaderComponentClassName?: string;
  }
  export interface FlatListProps<ItemT> {
    columnWrapperClassName?: string;
  }
}
