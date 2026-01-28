<script setup lang="ts">
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'refresh'): void
}>()

const props = defineProps<{
  modelValue: string
  showRefresh?: boolean
  placeholder?: string
  disabled?: boolean
}>()

const updateValue = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleRefresh = () => {
  emit('refresh')
}
</script>

<template>
  <div class="input-group">
    <input
      type="text"
      class="form-input"
      :value="modelValue"
      :placeholder="placeholder || 'Enter password'"
      :disabled="disabled"
      @input="updateValue"
    />
    <button
      v-if="showRefresh"
      type="button"
      class="btn btn-icon"
      title="Generate new password"
      @click="handleRefresh"
    >
      <Icon name="lucide:refresh-cw" size="20" />
    </button>
  </div>
</template>
