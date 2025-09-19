-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-09-2025 a las 20:46:42
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `agua_potable`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin_users`
--

CREATE TABLE `admin_users` (
  `username` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `admin_users`
--

INSERT INTO `admin_users` (`username`, `password`) VALUES
('admin', 'aguapotable2027'),
('admin2', 'administracion2027');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `payments`
--

CREATE TABLE `payments` (
  `folio` varchar(50) NOT NULL,
  `user_num` varchar(50) NOT NULL,
  `date_iso` datetime NOT NULL,
  `year` int(11) NOT NULL,
  `months` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`months`)),
  `rate` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `hydrant` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `num` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `calle` varchar(200) DEFAULT NULL,
  `tel` varchar(10) DEFAULT NULL,
  `tarifa` enum('domestica','comercial','hidrante') NOT NULL DEFAULT 'domestica'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`username`);

--
-- Indices de la tabla `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`folio`),
  ADD KEY `user_num` (`user_num`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`num`);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_num`) REFERENCES `users` (`num`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
