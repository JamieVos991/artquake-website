<script>
  import { onMount } from "svelte";

  let { data } = $props();

  // meteen door, zonder deze pagina in de geschiedenis te laten staan
  onMount(() => location.replace(data.doel));
</script>

<svelte:head>
  <meta http-equiv="refresh" content="0;url={data.doel}" />
  <meta name="robots" content="noindex" />
</svelte:head>

<p class="doorsturen">Deze pagina is verhuisd. <a href={data.doel} data-sveltekit-reload>Ga verder</a></p>

<style>
  .doorsturen {
    padding: 120px 20px;
    text-align: center;
    font: 400 16px/1.6 var(--font-mono);
  }
</style>
