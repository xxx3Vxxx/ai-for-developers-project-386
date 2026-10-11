import { Box } from "@mantine/core";
import { Outlet } from "react-router-dom";

import { Header } from "./Header";

export function Layout() {
  return (
    <>
      <Header />
      <Box component="main">
        <Outlet />
      </Box>
    </>
  );
}
