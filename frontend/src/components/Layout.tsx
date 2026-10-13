import { Box } from "@mantine/core";
import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { SkipLink } from "./SkipLink";

export function Layout() {
  return (
    <>
      <SkipLink />
      <Header />
      <Box component="main" id="main-content" tabIndex={-1}>
        <Outlet />
      </Box>
    </>
  );
}
