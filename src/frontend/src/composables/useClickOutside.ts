import { onMounted, onUnmounted, type Ref } from "vue";

export function useClickOutside(
  target: Ref<HTMLElement | null>,
  callback: () => void,
) {
  const handler = (e: MouseEvent) => {
    if (target.value && !target.value.contains(e.target as Node)) {
      callback();
    }
  };
  onMounted(() => window.addEventListener("click", handler));
  onUnmounted(() => window.removeEventListener("click", handler));
}
